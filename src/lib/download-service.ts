import { database } from "./firebase";
import { ref, push, set, get, query, orderByChild, equalTo } from "firebase/database";

const GOOGLE_DRIVE_API_KEY = "AIzaSyAA9ERw-9LZVEohRYtCWka_TQc6oXmvcVU";

export interface DownloadLink {
  id?: string;
  contentId: string;
  contentTitle: string;
  fileId?: string;
  sourceUrl?: string;
  token: string;
  userId?: string;
  used: boolean;
  usedAt?: number;
  createdAt: number;
  expiresAt: number;
}

export function sanitizeDownloadFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

// Generate a unique token for one-time download
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Extract Google Drive file ID from URL
export function getFileIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const queryId = parsed.searchParams.get("fileId") || parsed.searchParams.get("id");
    if (queryId && /^[a-zA-Z0-9_-]+$/.test(queryId)) {
      return queryId;
    }

    const pathMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch?.[1]) {
      return pathMatch[1];
    }
  } catch {
    // Fall back to pattern matching below.
  }
  
  const drivePatterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/uc\?.*\bid=([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.usercontent\.google\.com\/download\?.*\bid=([a-zA-Z0-9_-]+)/,
    /https?:\/\/docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];
  
  for (const pattern of drivePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Check if URL is a direct video URL (not Google Drive)
export function isDirectVideoUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !url.includes('drive.google.com') && !url.includes('docs.google.com');
}

// Create a direct download link (Google Drive or direct video URL)
export async function createDownloadLink(
  _contentId: string,
  contentTitle: string,
  videoUrl: string,
  _userId?: string
): Promise<{ downloadUrl: string; filename: string } | null> {
  if (!videoUrl) return null;

  const filename = sanitizeDownloadFilename(`${contentTitle}.mp4`);
  const fileId = getFileIdFromUrl(videoUrl);

  if (fileId) {
    return { downloadUrl: getGoogleDriveDownloadUrl(fileId, filename), filename };
  }

  if (isDirectVideoUrl(videoUrl)) {
    return { downloadUrl: videoUrl, filename };
  }

  return null;
}

// Validate and use a download link
export async function validateAndUseDownloadLink(token: string): Promise<{
  valid: boolean;
  fileId?: string;
  sourceUrl?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const linksRef = ref(database, "downloadLinks");
    const linkQuery = query(linksRef, orderByChild("token"), equalTo(token));
    const snapshot = await get(linkQuery);

    if (!snapshot.exists()) {
      return { valid: false, error: "Invalid download link" };
    }

    let linkData: DownloadLink | null = null;
    let linkKey: string | null = null;
    
    snapshot.forEach((child) => {
      linkData = child.val() as DownloadLink;
      linkKey = child.key;
    });

    if (!linkData || !linkKey) {
      return { valid: false, error: "Invalid download link" };
    }

    const link = linkData as DownloadLink;
    const key = linkKey as string;

    // Check if already used
    if (link.used) {
      return { 
        valid: false, 
        error: "This download link has already been used. Subscribe to www.luoancientmovies.com for unlimited downloads." 
      };
    }

    // Check if expired
    if (Date.now() > link.expiresAt) {
      return { 
        valid: false, 
        error: "This download link has expired. Please generate a new one." 
      };
    }

    // Mark as used
    const linkRef = ref(database, `downloadLinks/${key}`);
    await set(linkRef, {
      ...link,
      used: true,
      usedAt: Date.now(),
    });

    const filename = sanitizeDownloadFilename(`${link.contentTitle}.mp4`);
    
    return {
      valid: true,
      fileId: link.fileId,
      sourceUrl: link.sourceUrl,
      filename,
    };
  } catch (error) {
    console.error("Error validating download link:", error);
    return { valid: false, error: "Failed to validate download link" };
  }
}

// Google Drive download URL that shows the virus-scan confirmation page
// with the original file name as a blue link. Clicking "Download anyway"
// inside the iframe triggers the browser's native download manager.
export function getGoogleDriveDownloadUrl(fileId: string, _fileName?: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Cloudflare Worker that streams the original Google Drive file with the
// correct filename, so the browser's native download manager handles it.
export function getWorkerDownloadUrl(fileId: string, fileName: string): string {
  return `https://download.w64301879.workers.dev/download?fileId=${encodeURIComponent(
    fileId,
  )}&fileName=${encodeURIComponent(fileName)}`;
}

// Direct Google Drive download URL (used as automatic fallback when the
// Cloudflare Worker returns an error).
export function getDriveUserContentUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
}

function triggerAnchorDownload(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function triggerHiddenDriveDownload(fileId: string, fileName: string): void {
  const frameName = `drive-download-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const iframe = document.createElement("iframe");
  iframe.name = frameName;
  iframe.title = "Download";
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.position = "fixed";
  iframe.style.left = "-1px";
  iframe.style.top = "-1px";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";

  const form = document.createElement("form");
  form.method = "GET";
  form.action = "https://drive.usercontent.google.com/download";
  form.target = frameName;
  form.style.display = "none";

  const fields: Record<string, string> = {
    id: fileId,
    export: "download",
    confirm: "t",
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(iframe);
  document.body.appendChild(form);
  form.submit();
  form.remove();

  window.setTimeout(() => {
    iframe.remove();
  }, 60000);
}

// Mobile download flow: try the Cloudflare Worker first (real file id +
// real video name), and automatically fall back to direct Google Drive
// if the worker returns an error.
export async function startMobileWorkerDownload(
  fileId: string,
  fileName: string,
): Promise<void> {
  // Submit Google Drive's "Download anyway" request into an invisible iframe
  // so mobile browsers stay on the player page instead of showing Drive.
  triggerHiddenDriveDownload(fileId, fileName);
}

// Check if user has an active download link for content
export async function hasActiveDownloadLink(contentId: string, userId?: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const linksRef = ref(database, "downloadLinks");
    const linkQuery = query(linksRef, orderByChild("contentId"), equalTo(contentId));
    const snapshot = await get(linkQuery);

    if (!snapshot.exists()) return false;

    let hasActive = false;
    snapshot.forEach((child) => {
      const link = child.val() as DownloadLink;
      if (link.userId === userId && !link.used && Date.now() < link.expiresAt) {
        hasActive = true;
      }
    });

    return hasActive;
  } catch (error) {
    console.error("Error checking active download link:", error);
    return false;
  }
}

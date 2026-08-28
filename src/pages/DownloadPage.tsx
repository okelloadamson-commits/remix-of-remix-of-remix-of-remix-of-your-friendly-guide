import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";

const REDIRECT_URL = "https://www.luoancientmovies.com";

export default function DownloadPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const filename = searchParams.get("filename") || "video.mp4";

  const [status, setStatus] = useState<"loading" | "downloading">("loading");
  const [downloadFilename, setDownloadFilename] = useState<string>(filename);

  useEffect(() => {
    async function processDownload() {
      // No token → this link was copied/shared. Send to luoancientmovies.
      if (!token) {
        window.location.replace(REDIRECT_URL);
        return;
      }

      try {
        const finalFilename = filename;
        setDownloadFilename(finalFilename);
        setStatus("downloading");

        // Trigger the download from our own API route so the browser's
        // download manager stores /api/download?... instead of the real
        // backend video URL. Reusing that one-time token later redirects
        // to luoancientmovies.com.
        const downloadUrl = `/api/download?token=${encodeURIComponent(token)}&filename=${encodeURIComponent(finalFilename)}`;
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = finalFilename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (error) {
        console.error("Download error:", error);
        window.location.replace(REDIRECT_URL);
      }
    }

    processDownload();
  }, [token, filename]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin mb-4" />
            <h1 className="text-xl font-bold mb-2">Validating Download Link</h1>
            <p className="text-muted-foreground">Please wait while we verify your download...</p>
          </>
        )}

        {status === "downloading" && (
          <>
            <Download className="w-16 h-16 text-primary mx-auto animate-pulse mb-4" />
            <h1 className="text-xl font-bold mb-2">Downloading...</h1>
            <p className="text-muted-foreground mb-4">
              Your download is starting. If it doesn't begin automatically, please wait...
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              File: <span className="font-medium text-foreground">{downloadFilename}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Want unlimited downloads? Visit{" "}
              <a
                href={REDIRECT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                www.luoancientmovies.com
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

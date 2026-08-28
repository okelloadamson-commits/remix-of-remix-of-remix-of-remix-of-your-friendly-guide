import { AlertTriangle, Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DownloadFrameDialogProps {
  open: boolean;
  url: string;
  title: string;
  fallbackUrl?: string;
  fileId?: string;
  onClose: () => void;
}

export function DownloadFrameDialog({
  open,
  url,
  title,
  fallbackUrl,
  fileId,
  onClose,
}: DownloadFrameDialogProps) {
  const [frameKey, setFrameKey] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const downloadFrameRef = useRef<HTMLIFrameElement | null>(null);
  const frameContainerRef = useRef<HTMLDivElement | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const frameRecoveryTimerRef = useRef<number | null>(null);
  const frameLoadCountRef = useRef(0);
  const isMobileRef = useRef(false);

  const toggleFullscreen = () => {
    const el = frameContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    if (!open) {
      frameLoadCountRef.current = 0;
      setDownloadStarted(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Force iframe remount every time dialog opens so Google Drive
    // reloads fresh (prevents cached error pages on second download).
    setShowFallback(false);
    setDownloadStarted(false);
    frameLoadCountRef.current = 0;
    setFrameKey((k) => k + 1);

    isMobileRef.current =
      window.matchMedia("(max-width: 768px)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (frameRecoveryTimerRef.current) {
        window.clearTimeout(frameRecoveryTimerRef.current);
        frameRecoveryTimerRef.current = null;
      }
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, fallbackUrl]);

  // Detect Google Drive quota / "Too many users" interstitial server-side.
  // If blocked, reveal the manual new-tab fallback because browsers often
  // block automatic popups after an async quota check.
  useEffect(() => {
    if (!open) return;
    if (!fileId || !fallbackUrl) return;

    let cancelled = false;

    fetch(`/api/public/drive-check?id=${encodeURIComponent(fileId)}`)
      .then((r) => r.json())
      .then((data: { blocked?: boolean }) => {
        if (cancelled) return;
        // Don't show the "Download Anyway" bar pre-emptively — wait until
        // the iframe actually renders Google's white error/virus-scan page
        // (handled in handleFrameLoad). Keeping the probe in place so we
        // could still log/use it later if needed.
        void data;
      })
      .catch(() => {
        // Silently ignore probe failures.
      });

    return () => {
      cancelled = true;
    };
  }, [open, fileId, fallbackUrl]);

  const openFallback = () => {
    if (!fallbackUrl) return;
    // Trigger the download in-page: point a hidden iframe at the direct
    // download URL so the browser starts saving the original file without
    // opening a new tab. Also fire an <a download> click as a backup so
    // browsers that ignore iframe navigations still get the file.
    setDownloadStarted(true);
    if (downloadFrameRef.current) {
      downloadFrameRef.current.src = fallbackUrl;
    }
    try {
      const a = document.createElement("a");
      a.href = fallbackUrl;
      a.download = title || "";
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // ignore – iframe path will handle it
    }
    // If nothing actually downloads (frame goes blank, browser blocks it,
    // Google returns an error page), automatically re-arm the Download
    // Anyway button so the user can retry without closing the dialog.
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = window.setTimeout(() => {
      setDownloadStarted(false);
      setShowFallback(true);
    }, 4000);
  };

  const handleFrameLoad = () => {
    frameLoadCountRef.current += 1;
    if (!fallbackUrl) return;
    // Only reveal the "Download Anyway" bar once Google's white
    // interstitial / blank page has actually rendered. Google fires a
    // second load event when the iframe swaps from the initial dark
    // frame to the white virus-scan / quota page, so we wait for
    // load #2 on both mobile and desktop.
    // Both mobile and desktop wait for Google's white interstitial
    // (load #2) before revealing the "Download Anyway" bar, so it only
    // appears once the frame has actually gone blank.
    if (frameLoadCountRef.current < 2) return;
    if (frameRecoveryTimerRef.current) window.clearTimeout(frameRecoveryTimerRef.current);
    frameRecoveryTimerRef.current = window.setTimeout(() => {
      setDownloadStarted(false);
      setShowFallback(true);
    }, isMobileRef.current ? 900 : 700);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-md:w-[calc(100vw-1rem)] max-md:max-w-[calc(100vw-1rem)] h-[78dvh] sm:h-[85vh] bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-2xl max-md:border-[3px] max-md:border-transparent max-md:[background:linear-gradient(var(--background),var(--background))_padding-box,conic-gradient(from_0deg,#ff0000,#ff7f00,#ffff00,#00ff00,#00ffff,#0000ff,#8b00ff,#ff0000)_border-box]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="w-5 h-5 text-primary shrink-0" />
            <span className="font-semibold truncate">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div ref={frameContainerRef} className="relative min-h-0 flex-1">
          <iframe
            key={frameKey}
            src={url}
            title={title}
            className="h-full w-full bg-background"
            allow="downloads"
            onLoad={handleFrameLoad}
          />
          {/* Desktop overlay: blocks the blue filename link and warning text
              at the top of the Google Drive virus-scan page while leaving the
              "Download anyway" button (~155 px from top) fully clickable. */}
          <div className="pointer-events-none absolute inset-0 hidden md:block">
            <div className="pointer-events-auto h-[140px] w-full" />
            <div className="pointer-events-auto absolute top-[140px] left-0 h-[calc(100%-140px)] w-[25%]" />
            <div className="pointer-events-auto absolute top-[140px] right-0 h-[calc(100%-140px)] w-[25%]" />
          </div>
          {/* Mobile overlay: same idea as desktop but tuned for the mobile
              Drive layout — block the filename link / warning text above the
              "Download anyway" button and the side gutters below it. */}
          <div className="pointer-events-none absolute inset-0 md:hidden">
            <div className="pointer-events-auto h-[180px] w-full" />
            <div className="pointer-events-auto absolute top-[180px] left-0 h-[calc(100%-180px)] w-[12%]" />
            <div className="pointer-events-auto absolute top-[180px] right-0 h-[calc(100%-180px)] w-[12%]" />
            <div className="pointer-events-auto absolute bottom-0 left-0 h-[35%] w-full" />
          </div>
        </div>
        {showFallback && fallbackUrl && (
          <div className="border-t border-primary/30 bg-gradient-to-r from-primary/15 via-accent/20 to-primary/10 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Download not started?</p>
                  <p className="text-xs text-muted-foreground">If the frame went blank, tap again to start the browser download.</p>
                </div>
              </div>
              <button
                onClick={openFallback}
                className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] sm:w-auto"
              >
                <Download className="h-4 w-4" />
                {downloadStarted ? "Downloading…" : "Download Anyway"}
              </button>
            </div>
          </div>
        )}
        {/* Hidden iframe used to trigger the actual file download in-page. */}
        <iframe
          ref={downloadFrameRef}
          title="download"
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Star, Lock, Share2, Flag, Trophy, Play, Download, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageLoader } from "@/components/PageLoader";
import { getComedyById, getRelatedComedies, incrementContentViews, type Comedy } from "@/lib/firebase-db";

import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { AuthModal } from "@/components/auth/AuthModal";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { createDownloadLink, getFileIdFromUrl } from "@/lib/download-service";
import { DownloadFrameDialog } from "@/components/DownloadFrameDialog";
import {
  buildSubscriptionResetKey,
  resetDownloadCountsForSubscription,
  tryConsumeDownload,
  getDailyLimitForPlan,
} from "@/lib/download-limit";
import { SubscriptionRequired } from "@/components/subscription/SubscriptionRequired";
import { toast } from "@/hooks/use-toast";
import { useActivityTracker } from "@/hooks/useActivityTracker";

// Convert Google Drive URL to embed format (mirrors WatchPage)
function getEmbedUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const fileId = parsed.searchParams.get("fileId") || parsed.searchParams.get("id");
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  } catch {
    // fall through
  }
  const patterns = [
    /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /https?:\/\/docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  return url.replace("/view", "/preview");
}

export default function ComedyWatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading, subscription } = useSubscription();
  const { track } = useActivityTracker();

  const [comedy, setComedy] = useState<Comedy | null>(null);
  const [related, setRelated] = useState<Comedy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFrame, setDownloadFrame] = useState<{ url: string; title: string; fallbackUrl?: string; fileId?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getComedyById(id), getRelatedComedies(id)])
      .then(([c, r]) => {
        setComedy(c);
        setRelated(r);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (id && comedy) incrementContentViews(id, "movie").catch(() => undefined);
  }, [id, comedy]);

  // Scroll to player when hash present
  useEffect(() => {
    if (loading) return;
    if (location.hash === "#video-player") {
      setTimeout(() => {
        document.getElementById("video-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [loading, location.hash, comedy]);

  if (loading || subLoading) {
    return (
      <MainLayout>
        <PageLoader label="Luo Champion" />
      </MainLayout>
    );
  }

  if (!comedy) {
    return (
      <MainLayout>
        <div className="py-24 text-center text-muted-foreground">Luo Champion video not found.</div>
      </MainLayout>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <MainLayout>
        <div className="px-4 lg:px-6 py-8 max-w-3xl mx-auto">
          <SubscriptionRequired message="Subscribe to unlock Luo Champion videos and all other content." />
        </div>
      </MainLayout>
    );
  }

  const videoUrl = getEmbedUrl(comedy.videoUrl);

  const handleShare = async () => {
    track("Share", `Shared "${comedy.title}"`);
    const shareData = {
      title: comedy.title,
      text: `Watch ${comedy.title} on Luo Ancient Comedy`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* cancelled */
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const handleDownload = async () => {
    if (!comedy) return;
    track("Download", `Download requested for "${comedy.title}"`);
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }

    const rawVideoUrl = comedy.videoUrl;
    const fileId = getFileIdFromUrl(rawVideoUrl);
    const fallbackUrl = fileId
      ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`
      : rawVideoUrl ?? "";

    try {
      const planName = subscription?.plan;
      if (subscription) {
        const resetKey = buildSubscriptionResetKey(subscription);
        await resetDownloadCountsForSubscription(user.id, resetKey);
      }
      const limit = getDailyLimitForPlan(planName);
      const consume = await tryConsumeDownload(user.id, planName);
      if (!consume.allowed) {
        toast({
          title: "YOU HAVE REACHED YOUR DOWNLOAD LIMIT FOR TODAY",
          description: `Your ${planName} plan allows ${limit} downloads per day (resets at midnight). Upgrade your subscription for more daily downloads.`,
          variant: "destructive",
        });
        setShowSubscriptionModal(true);
        return;
      }
      if (limit !== -1) {
        toast({
          title: "Download started",
          description: `Daily downloads used: ${consume.count}/${limit}`,
        });
      }
    } catch (e) {
      console.error("Download limit check failed", e);
    }

    try {
      if (!rawVideoUrl) {
        toast({ title: "Download failed", description: "No video available to download.", variant: "destructive" });
        return;
      }
      setIsDownloading(true);
      const downloadLink = await createDownloadLink(
        comedy.id ?? id ?? "comedy",
        comedy.title,
        rawVideoUrl,
        user.id,
      );
      if (!downloadLink) {
        toast({ title: "Download failed", description: "Invalid video URL.", variant: "destructive" });
        setIsDownloading(false);
        return;
      }
      setDownloadFrame({
        url: downloadLink.downloadUrl,
        title: downloadLink.filename,
        fallbackUrl,
        fileId: fileId ?? undefined,
      });
      toast({ title: "Download ready", description: `Follow the download prompt to save ${downloadLink.filename}` });
      setIsDownloading(false);
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" });
      setIsDownloading(false);
    }
  };


  return (
    <MainLayout>
      <div className="pb-24 lg:pb-8">
        {/* Video Player — matches movie WatchPage */}
        <div
          id="video-player"
          className="relative bg-black w-full scroll-mt-20 overflow-hidden max-w-full"
          style={{ aspectRatio: "16 / 9" }}
        >
          {videoUrl ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <iframe
                src={videoUrl}
                className="absolute inset-0 w-full h-full border-0 block"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={comedy.title}
              />
              {/* Block Google Drive popout icon — solid overlay with logo */}
              <div className="absolute top-0 right-0 h-12 w-16 sm:h-14 sm:w-20 z-20 flex items-center justify-center bg-black pointer-events-auto">
                <img
                  src="/luo-ancient-logo.png"
                  alt="Luo Ancient"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                />
              </div>
              {/* Extra top strip to fully block Drive header on mobile */}
              <div className="absolute top-0 left-0 right-16 sm:right-20 h-8 sm:h-10 z-10 bg-black pointer-events-none" />
            </div>
          ) : (
            <>
              <img
                src={comedy.posterUrl}
                alt={comedy.title}
                className="w-full h-full object-cover opacity-30"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/placeholder.svg")}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <Lock className="w-10 h-10 text-white/70 mb-2" />
                <p className="text-white/80 text-sm">Video unavailable</p>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-around gap-2 border-b border-border py-3 px-3 sm:px-4 bg-background">
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-xs">Share</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{isDownloading ? "Downloading..." : "Download"}</span>
          </button>
        </div>

        {/* Content Info */}
        <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 mb-4">
            <div className="w-10 h-10 shrink-0 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-pink-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold leading-tight break-words">
                {comedy.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1.5">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-foreground font-medium">{comedy.rating}</span>
                </span>
                <span>•</span>
                <span>{comedy.releaseYear}</span>
                {comedy.duration ? (
                  <>
                    <span>•</span>
                    <span>{comedy.duration}m</span>
                  </>
                ) : null}
                {comedy.vjName && (
                  <>
                    <span>•</span>
                    <span className="text-purple-500 truncate max-w-[120px]">VJ {comedy.vjName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {comedy.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-line break-words">
              {comedy.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 py-3 border-t border-border text-xs sm:text-sm text-muted-foreground">
            <p className="min-w-0 flex-1 line-clamp-2">Find any content infringes on your rights, please contact us.</p>
            <button className="flex shrink-0 items-center gap-1 hover:text-foreground transition-colors">
              <Flag className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>


        {/* Related — YouTube-like landscape grid */}
        {related.length > 0 && (
          <div className="px-4 lg:px-6 pt-4">
            <h2 className="text-xl lg:text-2xl font-bold mb-4">More Comedies</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {related.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/watch/luo-champion/${c.id}#video-player`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                    <img
                      src={c.posterUrl}
                      alt={c.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/placeholder.svg")}
                    />
                    {c.duration ? (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                        {c.duration}m
                      </div>
                    ) : null}
                    <div className="absolute inset-0 hidden md:flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-pink-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {c.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span>{c.rating}</span>
                        <span>•</span>
                        <span>{c.releaseYear}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} defaultMode="login" />
      <SubscriptionModal open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal} />
      <DownloadFrameDialog
        open={!!downloadFrame}
        url={downloadFrame?.url || ""}
        title={downloadFrame?.title || ""}
        fallbackUrl={downloadFrame?.fallbackUrl}
        fileId={downloadFrame?.fileId}
        onClose={() => setDownloadFrame(null)}
      />
    </MainLayout>
  );
}

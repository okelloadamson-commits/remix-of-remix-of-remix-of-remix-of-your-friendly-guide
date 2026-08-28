import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  Play,
  Volume2,
  Settings,
  Maximize,
  Download,
  SkipBack,
  SkipForward,
  Share2,
  Flag,
  Star,
  ChevronDown,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { MovieCard } from "@/components/movies/MovieCard";
import {
  getMovie,
  getSeriesById,
  getEpisodesBySeriesId,
  getRelatedMovies,
  getRelatedSeries,
  getMovies,
  getSeries,
  incrementContentViews,
  type Movie,
  type Series,
  type Episode,
  isMovieInAgentMode,
} from "@/lib/firebase-db";
import { createDownloadLink, getFileIdFromUrl } from "@/lib/download-service";
import { DownloadFrameDialog } from "@/components/DownloadFrameDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  buildSubscriptionResetKey,
  resetDownloadCountsForSubscription,
  tryConsumeDownload,
  getDailyLimitForPlan,
} from "@/lib/download-limit";
import { SubscriptionRequired } from "@/components/subscription/SubscriptionRequired";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { AuthModal } from "@/components/auth/AuthModal";
import playingIndicator from "@/assets/playing-indicator.webp";
import { useActivityTracker } from "@/hooks/useActivityTracker";

export default function WatchPage() {
  const { id, seriesId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    subscription,
    hasActiveSubscription,
    hasAgentPlan,
    isLoading: subscriptionLoading,
  } = useSubscription();
  const { track } = useActivityTracker();
  const isMobile = useIsMobile();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [relatedContent, setRelatedContent] = useState<(Movie | Series)[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFrame, setDownloadFrame] = useState<{ url: string; title: string; fallbackUrl?: string; fileId?: string } | null>(null);

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(0);

  // Scroll to player when hash present and content loaded
  useEffect(() => {
    if (loading) return;
    if (location.hash === "#video-player") {
      setTimeout(() => {
        const el = document.getElementById("video-player");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [loading, location.hash, movie, series]);

  const isSeries = !!seriesId;
  const contentId = seriesId || id;

  // Fetch content data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (isSeries && seriesId) {
          // Fetch series data
          const [seriesData, episodesData, allSeriesData] = await Promise.all([
            getSeriesById(seriesId),
            getEpisodesBySeriesId(seriesId),
            getSeries(),
          ]);
          setSeries(seriesData);
          setEpisodes(episodesData);
          setAllSeries(allSeriesData);

          if (episodesData.length > 0) {
            const querySeason = searchParams.get("season");
            const queryEpisode = searchParams.get("episode");

            if (querySeason && queryEpisode) {
              const targetSeason = parseInt(querySeason);
              const targetEpisodeNum = parseInt(queryEpisode);
              setSelectedSeason(targetSeason);
              const seasonEps = episodesData.filter((ep) => ep.seasonNumber === targetSeason);
              const targetEp = seasonEps.find((ep) => ep.episodeNumber === targetEpisodeNum);
              const targetIndex = targetEp ? seasonEps.indexOf(targetEp) : 0;
              setSelectedEpisode(targetEp || seasonEps[0] || episodesData[0]);
              setSelectedEpisodeIndex(targetIndex);
            } else {
              setSelectedEpisode(episodesData[0]);
            }
          }

          // Get related series
          if (seriesData) {
            const related = await getRelatedSeries(seriesId, seriesData.genre);
            setRelatedContent(related);
            // Increment views
            incrementContentViews(seriesId, "series");
          }
        } else if (id) {
          // Fetch movie data
          const [movieData, allMoviesData] = await Promise.all([getMovie(id), getMovies()]);
          setMovie(movieData);
          setAllMovies(allMoviesData);

          // Get related movies
          if (movieData) {
            const related = await getRelatedMovies(id, movieData.genre);
            setRelatedContent(related);
            // Increment views
            incrementContentViews(id, "movie");
          }
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, seriesId, isSeries]);

  // Filter episodes by selected season
  const seasonEpisodes = episodes.filter((ep) => ep.seasonNumber === selectedSeason);
  const totalEpisodes = seasonEpisodes.length;

  // Get current content for navigation
  const currentContent = isSeries ? series : movie;
  const currentList = isSeries ? allSeries : allMovies;
  const currentIndex = currentList.findIndex((item) => item.id === contentId);
  const prevContent = currentIndex > 0 ? currentList[currentIndex - 1] : null;
  const nextContent = currentIndex < currentList.length - 1 ? currentList[currentIndex + 1] : null;

  const canGoPrevious = isSeries ? selectedEpisodeIndex > 0 || selectedSeason > 1 : !!prevContent;
  const canGoNext = isSeries
    ? selectedEpisodeIndex < totalEpisodes - 1 || selectedSeason < (series?.seasons || 1)
    : !!nextContent;

  const handleShare = async () => {
    const title = currentContent?.title || "Watch on Luo Ancient";
    track("Share", `Shared "${title}"`);
    const shareData = {
      title,
      text: `Watch ${title} on Luo Ancient Movies`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  // Generate download filename
  const getDownloadFilename = (): string => {
    if (isSeries && selectedEpisode) {
      return `${currentContent?.title} S${selectedEpisode.seasonNumber.toString().padStart(2, "0")}E${selectedEpisode.episodeNumber.toString().padStart(2, "0")}`;
    }
    return currentContent?.title || "video";
  };

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAgentSubscription, setShowAgentSubscription] = useState(false);

  const handleDownload = async () => {
    track("Download", `Download requested for "${currentContent?.title || "unknown"}"`);
    // Check if user is logged in first
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Check if this is an agent episode — require Agent Plan
    const isAgentContent = isSeries && selectedEpisode?.isAgent;
    if (isAgentContent && !hasAgentPlan) {
      setShowAgentSubscription(true);
      return;
    }

    // Check subscription (admin has free access via hasActiveSubscription)
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }

    const fileId = getFileIdFromUrl(rawVideoUrl);
    const fallbackUrl = fileId
      ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`
      : rawVideoUrl ?? "";
    // Enforce daily download limit per plan (admin/lifetime/agent unlimited)
    try {
      const planName = subscription?.plan;
      if (subscription) {
        const resetKey = buildSubscriptionResetKey(subscription);
        await resetDownloadCountsForSubscription(user.id, resetKey);
      }
      const limit = getDailyLimitForPlan(planName);
      const consume = await tryConsumeDownload(user.id, planName);
      if (!consume.allowed) {
        track(
          "Download Limit Reached",
          `Tried to download "${currentContent?.title || "unknown"}" after using ${consume.count}/${limit} on ${planName} plan`,
        );
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
        toast({
          title: "Download failed",
          description: "No video available to download.",
          variant: "destructive",
        });
        return;
      }

      setIsDownloading(true);
      const filename = getDownloadFilename();

      const contentDownloadId = isSeries
        ? `${seriesId || "series"}-${selectedEpisode?.id || selectedEpisode?.episodeNumber || "episode"}`
        : id || "movie";
      const downloadLink = await createDownloadLink(
        contentDownloadId,
        filename,
        rawVideoUrl,
        user.id,
      );

      if (!downloadLink) {
        toast({
          title: "Download failed",
          description: "Invalid video URL.",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }


      // Desktop: open the in-site download frame; the Drive confirmation page
      // renders inside it, and clicking "Download anyway" hands off to the
      // browser's native download manager.
      setDownloadFrame({
        url: downloadLink.downloadUrl,
        title: downloadLink.filename,
        fallbackUrl,
        fileId: fileId ?? undefined,
      });

      toast({
        title: "Download ready",
        description: `Follow the download prompt to save ${downloadLink.filename}`,
      });

      setIsDownloading(false);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Please try again.",
        variant: "destructive",
      });
      setIsDownloading(false);
    }
  };

  const handlePrevious = () => {
    if (isSeries) {
      if (selectedEpisodeIndex > 0) {
        const newIndex = selectedEpisodeIndex - 1;
        setSelectedEpisodeIndex(newIndex);
        setSelectedEpisode(seasonEpisodes[newIndex]);
      } else if (selectedSeason > 1) {
        setSelectedSeason(selectedSeason - 1);
        // Will trigger useEffect to load previous season's episodes
      }
    } else if (prevContent) {
      navigate(`/watch/${prevContent.id}`);
    }
  };

  const handleNext = () => {
    if (isSeries) {
      if (selectedEpisodeIndex < totalEpisodes - 1) {
        const newIndex = selectedEpisodeIndex + 1;
        setSelectedEpisodeIndex(newIndex);
        setSelectedEpisode(seasonEpisodes[newIndex]);
      } else if (selectedSeason < (series?.seasons || 1)) {
        setSelectedSeason(selectedSeason + 1);
        setSelectedEpisodeIndex(0);
      }
    } else if (nextContent) {
      navigate(`/watch/${nextContent.id}`);
    }
  };

  const handleEpisodeSelect = (episode: Episode, index: number) => {
    // Check if user is logged in
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Agent episodes require agent plan
    if (episode.isAgent && !hasAgentPlan) {
      setShowAgentSubscription(true);
      return;
    }

    // Check if user has active subscription
    if (!episode.isAgent && !hasActiveSubscription && !hasAgentPlan) {
      setShowSubscriptionModal(true);
      return;
    }

    setSelectedEpisode(episode);
    setSelectedEpisodeIndex(index);
  };

  // Convert Google Drive URL to embed format
  const getEmbedUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;

    try {
      const parsed = new URL(url);
      const fileId = parsed.searchParams.get("fileId") || parsed.searchParams.get("id");
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    } catch {
      // Fall through to Google Drive URL pattern matching.
    }

    // Check if it's a Google Drive URL
    const drivePatterns = [
      /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /https?:\/\/docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of drivePatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Return the embed-friendly preview URL
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    // If not a Google Drive URL, return as-is
    return url;
  };

  // Get video URL for iframe
  const rawVideoUrl = isSeries ? selectedEpisode?.videoUrl : movie?.videoUrl;
  const videoUrl = getEmbedUrl(rawVideoUrl);
  const posterUrl = isSeries
    ? selectedEpisode?.thumbnailUrl || series?.posterUrl
    : movie?.posterUrl;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!currentContent) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Content not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="pb-24 lg:pb-8">
        {/* Video Player Section */}
        <div className="flex flex-col lg:flex-row">
          {/* Player Column */}
          <div className={`flex-1 ${isSeries ? "lg:pr-0" : ""}`}>
            {/* Video Container - Iframe Player */}
            <div id="video-player" className="relative bg-black w-full scroll-mt-20 overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
              {(() => {
                const isAgent = movie && isMovieInAgentMode(movie);
                const isAgentEpisode = isSeries && selectedEpisode?.isAgent;
                const needsAgentPlan = (isAgent || isAgentEpisode) && !hasAgentPlan;
                const needsSubscription =
                  !isAgent && !isAgentEpisode && !hasActiveSubscription && !hasAgentPlan;

                if (needsAgentPlan) {
                  return (
                    <>
                      <img
                        src={posterUrl}
                        alt={currentContent.title}
                        className="w-full h-full object-cover opacity-30"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
                          <Lock className="w-8 h-8 lg:w-10 lg:h-10 text-orange-500" />
                        </div>
                        <h3 className="text-white text-lg lg:text-xl font-bold mb-2">
                          Agent Plan Required
                        </h3>
                        <p className="text-white/70 text-sm text-center px-4 mb-4">
                          {isAgentEpisode
                            ? "This episode requires an Agent Plan (UGX 10,000) to access."
                            : "This is an Agent movie. Subscribe to Agent Plan (UGX 10,000) to access."}
                        </p>
                      </div>
                    </>
                  );
                }

                if (needsSubscription) {
                  return (
                    <>
                      <img
                        src={posterUrl}
                        alt={currentContent.title}
                        className="w-full h-full object-cover opacity-30"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                          <Lock className="w-8 h-8 lg:w-10 lg:h-10 text-primary" />
                        </div>
                        <h3 className="text-white text-lg lg:text-xl font-bold mb-2">
                          Subscription Required
                        </h3>
                        <p className="text-white/70 text-sm text-center px-4 mb-4">
                          Subscribe to watch and download this content
                        </p>
                      </div>
                    </>
                  );
                }

                return videoUrl ? (
                  <div className="absolute inset-0 w-full h-full overflow-hidden">
                    <iframe
                      src={videoUrl}
                      className="absolute inset-0 w-full h-full border-0 block"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      title={currentContent.title}
                    />
                    {/* Block Google Drive popout icon — solid overlay with logo */}
                    <div className="absolute top-0 right-0 h-12 w-16 sm:h-14 sm:w-20 z-20 flex items-center justify-center bg-black pointer-events-auto">
                      <img
                        src="/luo-ancient-logo.png"
                        alt="Luo Ancient"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                      />
                    </div>
                    <div className="absolute top-0 left-0 right-16 sm:right-20 h-8 sm:h-10 z-10 bg-black pointer-events-none" />
                  </div>
                ) : (
                  <>
                    <img
                      src={posterUrl}
                      alt={currentContent.title}
                      className="w-full h-full object-cover opacity-30"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Play className="w-8 h-8 lg:w-10 lg:h-10 text-white fill-white ml-1" />
                      </button>
                    </div>
                    {/* Video Controls */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 lg:p-4">
                      {/* Progress Bar */}
                      <div className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer">
                        <div className="h-full w-[1%] bg-primary rounded-full relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                      {/* Controls Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button className="text-white hover:text-primary transition-colors">
                            <Play className="w-5 h-5 fill-white" />
                          </button>
                          <button className="text-white hover:text-primary transition-colors">
                            <Volume2 className="w-5 h-5" />
                          </button>
                          <span className="text-white text-sm">
                            00:00 /{" "}
                            {isSeries
                              ? `${selectedEpisode?.duration || 0}m`
                              : `${movie?.duration || 0}m`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white text-sm hidden sm:block">English</span>
                          <span className="text-white text-sm hidden sm:block">480P</span>
                          <button className="text-white hover:text-primary transition-colors">
                            <Settings className="w-5 h-5" />
                          </button>
                          <button className="text-white hover:text-primary transition-colors">
                            <Maximize className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-around border-b border-border py-3 px-4 bg-background">
              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-xs">Share</span>
              </button>
              <button
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  canGoPrevious
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                <SkipBack className="w-5 h-5" />
                <span className="text-xs">{isSeries ? "Prev Ep" : "Previous"}</span>
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  canGoNext
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                <SkipForward className="w-5 h-5" />
                <span className="text-xs">{isSeries ? "Next Ep" : "Next"}</span>
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
                <span className="text-sm font-medium">
                  {isDownloading ? "Downloading..." : "Download"}
                </span>
              </button>
            </div>

            {/* Episode Selector - Mobile: Shows under action buttons */}
            {isSeries && series && (
              <div className="lg:hidden bg-card border-b border-border">
                <div className="p-4">
                  <h3 className="font-semibold mb-3">Episodes</h3>

                  {/* Season Grid Selector */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mb-4">
                    {Array.from(new Set(episodes.map((ep) => ep.seasonNumber)))
                      .sort((a, b) => a - b)
                      .map((season) => (
                        <button
                          key={season}
                          onClick={() => {
                            setSelectedSeason(season);
                            setSelectedEpisodeIndex(0);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                            selectedSeason === season
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border hover:bg-accent text-foreground"
                          }`}
                        >
                          S{season.toString().padStart(2, "0")}
                        </button>
                      ))}
                  </div>

                  {/* Episode Grid */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {seasonEpisodes.length > 0 ? (
                      seasonEpisodes.map((ep, index) => (
                        <button
                          key={ep.id}
                          onClick={() => handleEpisodeSelect(ep, index)}
                          className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                            selectedEpisode?.id === ep.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent hover:bg-accent/80 text-foreground"
                          }`}
                        >
                          {selectedEpisode?.id === ep.id ? (
                            <img
                              src={playingIndicator}
                              alt="Playing"
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            ep.episodeNumber.toString().padStart(2, "0")
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="col-span-6 text-center text-muted-foreground text-sm py-4">
                        No episodes available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Content Info */}
            <div className="px-4 lg:px-6 py-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
                    {currentContent.title}
                    {isSeries && selectedEpisode && (
                      <span className="text-base font-normal text-muted-foreground">
                        S{selectedEpisode.seasonNumber.toString().padStart(2, "0")} E
                        {selectedEpisode.episodeNumber.toString().padStart(2, "0")}
                      </span>
                    )}
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-foreground font-medium">{currentContent.rating}</span>
                    </div>
                    <span>|</span>
                    <span>{isSeries ? series?.releaseYear : movie?.releaseYear}</span>
                    <span>|</span>
                    <span>{currentContent.genre}</span>
                  </div>
                </div>
              </div>

              {/* Content Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h2 className="text-lg font-bold mb-2">
                    {isSeries && selectedEpisode ? selectedEpisode.title : currentContent.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-2">
                    {isSeries ? series?.releaseYear : movie?.releaseYear}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isSeries && selectedEpisode
                      ? selectedEpisode.description
                      : currentContent.description}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                    <span className="text-3xl font-bold">{currentContent.rating}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{currentContent.genre}</span>
                  </div>
                </div>
              </div>

              {/* Report */}
              <div className="flex items-center justify-between py-3 border-t border-border text-sm text-muted-foreground">
                <p>Find any content infringes on your rights, please contact us.</p>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Flag className="w-4 h-4" />
                  Report
                </button>
              </div>
            </div>
          </div>

          {/* Episode Selector - Desktop: Side panel */}
          {isSeries && series && (
            <div className="hidden lg:block lg:w-72 xl:w-80 bg-card border-l border-border">
              <div className="p-4">
                <h3 className="font-semibold mb-3">Episodes</h3>

                {/* Season Grid Selector */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {Array.from(new Set(episodes.map((ep) => ep.seasonNumber)))
                    .sort((a, b) => a - b)
                    .map((season) => (
                      <button
                        key={season}
                        onClick={() => {
                          setSelectedSeason(season);
                          setSelectedEpisodeIndex(0);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          selectedSeason === season
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:bg-accent text-foreground"
                        }`}
                      >
                        S{season.toString().padStart(2, "0")}
                      </button>
                    ))}
                </div>

                {/* Episode Grid */}
                <div className="grid grid-cols-6 gap-1.5">
                  {seasonEpisodes.length > 0 ? (
                    seasonEpisodes.map((ep, index) => (
                      <button
                        key={ep.id}
                        onClick={() => handleEpisodeSelect(ep, index)}
                        className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                          selectedEpisode?.id === ep.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent hover:bg-accent/80 text-foreground"
                        }`}
                      >
                        {selectedEpisode?.id === ep.id ? (
                          <img
                            src={playingIndicator}
                            alt="Playing"
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          ep.episodeNumber.toString().padStart(2, "0")
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="col-span-6 text-center text-muted-foreground text-sm py-4">
                      No episodes available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Content Section */}
        <div className="px-4 lg:px-6 pt-8">
          <h2 className="text-xl lg:text-2xl font-bold mb-4">
            Related {isSeries ? "Series" : "Movies"}
          </h2>
          {relatedContent.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7 gap-2 lg:gap-3">
              {relatedContent.map((item) => (
                <MovieCard key={item.id} movie={item} contentType={isSeries ? "series" : "movie"} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No related content found</p>
          )}
        </div>
      </div>

      {/* Auth Modal for non-logged in users */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} defaultMode="login" />

      {/* Subscription Modal for users without subscription */}
      <SubscriptionModal open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal} />

      {/* Agent Subscription Modal */}
      <SubscriptionModal
        open={showAgentSubscription}
        onOpenChange={setShowAgentSubscription}
        agentOnly
      />

      {/* In-site Download Frame */}
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

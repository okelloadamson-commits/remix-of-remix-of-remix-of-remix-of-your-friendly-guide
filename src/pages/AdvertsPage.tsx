import { MainLayout } from "@/components/layout/MainLayout";
import { getAdverts, type Advert } from "@/lib/firebase-db";
import { Megaphone, Play, X, Pause, Volume2, VolumeX, Maximize, SkipForward, SkipBack } from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function useYouTubePlayer(
  containerRef: React.RefObject<HTMLDivElement>,
  videoId: string | null
) {
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    const loadAPI = () =>
      new Promise<void>((resolve) => {
        if (window.YT?.Player) { resolve(); return; }
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
        window.onYouTubeIframeAPIReady = () => resolve();
      });

    let destroyed = false;

    loadAPI().then(() => {
      if (destroyed || !containerRef.current) return;
      const el = document.createElement("div");
      el.id = "yt-player-" + Date.now();
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(el);

      playerRef.current = new window.YT.Player(el.id, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          autoplay: 1, controls: 0, modestbranding: 1, rel: 0,
          showinfo: 0, iv_load_policy: 3, disablekb: 1, fs: 0,
          playsinline: 1, origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => { setDuration(e.target.getDuration()); setIsPlaying(true); },
          onStateChange: (e: any) => {
            const playing = e.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            if (playing) setDuration(e.target.getDuration());
          },
        },
      });

      intervalRef.current = window.setInterval(() => {
        if (playerRef.current?.getCurrentTime) setCurrentTime(playerRef.current.getCurrentTime());
      }, 500);
    });

    return () => {
      destroyed = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    isMuted ? playerRef.current.unMute() : playerRef.current.mute();
    setIsMuted(!isMuted);
  }, [isMuted]);

  const seekTo = useCallback((time: number) => { playerRef.current?.seekTo(time, true); }, []);

  const skip = useCallback((seconds: number) => {
    if (!playerRef.current) return;
    const t = playerRef.current.getCurrentTime() + seconds;
    playerRef.current.seekTo(Math.max(0, Math.min(t, duration)), true);
  }, [duration]);

  return { isPlaying, isMuted, currentTime, duration, togglePlay, toggleMute, seekTo, skip };
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return m ? m[1] : null;
}

export default function AdvertsPage() {
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Advert | null>(null);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null!);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const ytId = activeVideo ? getYouTubeId(activeVideo.linkUrl) : null;
  const { isPlaying, isMuted, currentTime, duration, togglePlay, toggleMute, seekTo, skip } =
    useYouTubePlayer(containerRef, ytId);

  useEffect(() => {
    getAdverts().then(setAdverts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  const handleFullscreen = () => {
    if (!wrapperRef.current) return;
    document.fullscreenElement ? document.exitFullscreen() : wrapperRef.current.requestFullscreen();
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * duration);
  };

  const getEmbedUrl = (url: string) => {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    return url;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <MainLayout>
      <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
        <h1 className="text-2xl font-bold mb-6">Guide</h1>

        {activeVideo && (
          <div className="mb-6 rounded-lg overflow-hidden border border-border bg-card">
            <div className="flex items-center justify-between p-3 bg-muted/50">
              <h2 className="font-semibold truncate">{activeVideo.title}</h2>
              <button onClick={() => setActiveVideo(null)} className="p-1 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={wrapperRef}
              className="w-full aspect-video max-h-[80vh] relative select-none bg-black"
              onMouseMove={ytId ? handleMouseMove : undefined}
              onMouseLeave={() => ytId && setShowControls(false)}
            >
              {ytId ? (
                <>
                  <div ref={containerRef} className="w-full h-full" />

                  {/* Full overlay blocks all YouTube UI interaction */}
                  <div className="absolute inset-0 z-10" onClick={togglePlay} />

                  {/* Center play/pause indicator */}
                  {showControls && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/40 rounded-full p-4 backdrop-blur-sm">
                        {isPlaying ? <Pause className="w-10 h-10 text-white" /> : <Play className="w-10 h-10 text-white fill-white" />}
                      </div>
                    </div>
                  )}

                  {/* Bottom controls */}
                  <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <div className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-3 group hover:h-2.5 transition-all" onClick={handleSeekClick}>
                      <div className="h-full bg-primary rounded-full relative" style={{ width: `${progress}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                        </button>
                        <button onClick={() => skip(-10)} className="text-white hover:text-primary transition-colors">
                          <SkipBack className="w-5 h-5" />
                        </button>
                        <button onClick={() => skip(10)} className="text-white hover:text-primary transition-colors">
                          <SkipForward className="w-5 h-5" />
                        </button>
                        <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <span className="text-white text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      </div>
                      <button onClick={handleFullscreen} className="text-white hover:text-primary transition-colors">
                        <Maximize className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <iframe src={getEmbedUrl(activeVideo.linkUrl)} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" title={activeVideo.title} />
              )}
            </div>

            {activeVideo.description && (
              <div className="p-4 border-t border-border">
                <p className="text-sm text-muted-foreground">{activeVideo.description}</p>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <PageLoader label="ADVERTS" />
        ) : adverts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Megaphone className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md">
              Advertise your business with Luo Ancient Movies. Reach thousands of viewers across Uganda and beyond.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {adverts.map((advert) => (
              <button
                key={advert.id}
                onClick={() => setActiveVideo(advert)}
                className={`group block rounded-lg overflow-hidden border text-left w-full transition-colors ${
                  activeVideo?.id === advert.id ? "border-primary ring-2 ring-primary/30" : "border-border bg-card hover:border-primary"
                }`}
              >
                <div className="aspect-video overflow-hidden relative">
                  <img src={advert.imageUrl} alt={advert.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/90 lg:bg-transparent lg:px-0 lg:py-0">
                      <Play className="w-5 h-5 lg:w-12 lg:h-12 text-white fill-white" />
                      <span className="text-white text-sm font-semibold lg:hidden">Play Now</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{advert.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{advert.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
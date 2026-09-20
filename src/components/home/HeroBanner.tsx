import { Link } from "react-router-dom";
import { Play, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { getFeaturedContent, getHeroImages, type ContentItem, type HeroImage } from "@/lib/firebase-db";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const AUTO_SLIDE_INTERVAL = 15000;

const ANIMATIONS = [
  // Fade
  { enter: "animate-[fadeIn_0.8s_ease-out_forwards]", exit: "animate-[fadeOut_0.5s_ease-in_forwards]" },
  // Slide from right
  { enter: "animate-[slideInRight_0.7s_ease-out_forwards]", exit: "animate-[slideOutLeft_0.5s_ease-in_forwards]" },
  // Zoom in
  { enter: "animate-[zoomIn_0.8s_ease-out_forwards]", exit: "animate-[zoomOut_0.5s_ease-in_forwards]" },
  // Slide from bottom
  { enter: "animate-[slideInUp_0.7s_ease-out_forwards]", exit: "animate-[slideOutDown_0.5s_ease-in_forwards]" },
  // Flip
  { enter: "animate-[flipIn_0.8s_ease-out_forwards]", exit: "animate-[flipOut_0.5s_ease-in_forwards]" },
  // Blur in
  { enter: "animate-[blurIn_0.8s_ease-out_forwards]", exit: "animate-[blurOut_0.5s_ease-in_forwards]" },
];

type SlideItem =
  | { kind: "content"; data: ContentItem }
  | { kind: "hero"; data: HeroImage };

export function HeroBanner() {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animState, setAnimState] = useState<"enter" | "exit">("enter");
  const [animIndex, setAnimIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const isTransitioning = useRef(false);

  useEffect(() => {
    async function fetchSlides() {
      try {
        const [content, heroImages] = await Promise.all([
          getFeaturedContent(10),
          getHeroImages(),
        ]);
        const contentSlides: SlideItem[] = content.map((c) => ({ kind: "content", data: c }));
        const heroSlides: SlideItem[] = heroImages.map((h) => ({ kind: "hero", data: h }));
        setSlides([...heroSlides, ...contentSlides]);
      } catch (error) {
        console.error("Error fetching slides:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSlides();
  }, []);

  const transitionTo = useCallback((nextIndex: number) => {
    if (isTransitioning.current || slides.length <= 1) return;
    isTransitioning.current = true;
    setAnimState("exit");
    setTimeout(() => {
      const nextAnim = (animIndex + 1) % ANIMATIONS.length;
      setAnimIndex(nextAnim);
      setDisplayIndex(nextIndex);
      setCurrentIndex(nextIndex);
      setAnimState("enter");
      setTimeout(() => {
        isTransitioning.current = false;
      }, 800);
    }, 500);
  }, [slides.length, animIndex]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      const next = (currentIndex + 1) % slides.length;
      transitionTo(next);
    }, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [slides.length, currentIndex, transitionTo]);

  const goToPrevious = useCallback(() => {
    const prev = (currentIndex - 1 + slides.length) % slides.length;
    transitionTo(prev);
  }, [slides.length, currentIndex, transitionTo]);

  const goToNext = useCallback(() => {
    const next = (currentIndex + 1) % slides.length;
    transitionTo(next);
  }, [slides.length, currentIndex, transitionTo]);

  if (loading) {
    return (
      <div className="relative w-full h-[250px] lg:h-[380px] overflow-hidden mb-8">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (slides.length === 0) return null;

  const current = slides[displayIndex];
  const anim = ANIMATIONS[animIndex];
  const animClass = animState === "enter" ? anim.enter : anim.exit;

  return (
    <div className="relative w-full h-[250px] lg:h-[380px] overflow-hidden mb-0 group rounded-xl">
      {/* Background Image */}
      <div className={`absolute inset-0 rounded-xl overflow-hidden ${animClass}`}>
        <img
          src={current.kind === "content" ? current.data.posterUrl : current.data.imageUrl}
          alt={current.data.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
        />
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/70 z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/70 z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}


      {/* Content overlay */}
      <div className={`absolute bottom-8 left-0 right-0 ${animClass}`}>
        <div className="px-4 lg:px-6 max-w-xl">
          {current.kind === "hero" ? (
            <div>
              {current.data.badgeText && (
                <span className="inline-block px-2.5 py-0.5 mb-2 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                  {current.data.badgeText}
                </span>
              )}
              <h2 className="text-xl lg:text-3xl font-black mb-1 bg-clip-text text-transparent uppercase tracking-widest italic" style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, backgroundImage: 'linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00bfff, #8000ff, #ff00ff)', filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.5)) drop-shadow(-1px -1px 0px rgba(0,0,0,0.7)) drop-shadow(2px 3px 4px rgba(0,0,0,0.6))', WebkitTextStroke: '0.5px rgba(255,255,255,0.2)' }}>{current.data.title}</h2>
              {current.data.subtitle && (
                <p className="text-sm text-white/80 mb-1 drop-shadow-md font-bold">{current.data.subtitle}</p>
              )}
              <p className="max-w-full text-xs sm:text-sm mb-3 line-clamp-2 font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{current.data.description}</p>
              {current.data.linkUrl && (
                <Link to={current.data.linkUrl}>
                  <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 h-8 px-4 text-xs">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Watch Now
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-xl lg:text-3xl font-black mb-1 bg-clip-text text-transparent uppercase tracking-widest italic" style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, backgroundImage: 'linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00bfff, #8000ff, #ff00ff)', filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.5)) drop-shadow(-1px -1px 0px rgba(0,0,0,0.7)) drop-shadow(2px 3px 4px rgba(0,0,0,0.6))', WebkitTextStroke: '0.5px rgba(255,255,255,0.2)' }}>{current.data.title}</h2>
              <div className="flex items-center gap-2 text-xs text-white/70 mb-2 drop-shadow-md">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-white font-medium">{current.data.rating}</span>
                </div>
                <span>{current.data.releaseYear}</span>
                <span>{current.data.genre}</span>
              </div>
              <p className="max-w-full text-xs sm:text-sm mb-3 line-clamp-1 font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{current.data.description}</p>
              <Link to={current.data.type === "series" ? `/watch/series/${current.data.id}` : `/watch/${current.data.id}`}>
                <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 h-8 px-4 text-xs">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Watch Now
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => transitionTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "w-6 bg-primary" : "bg-foreground/30 hover:bg-foreground/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Marquee inside hero (all devices) */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden whitespace-nowrap h-6 sm:h-7 lg:h-8 bg-background/40 backdrop-blur-sm z-10 pointer-events-none">
        <div
          className="absolute whitespace-nowrap flex gap-[33vw] top-1/2 -translate-y-1/2"
          style={{
            animation: "marquee-continuous 35s linear infinite, easter-blink-fade 35s ease-in-out infinite",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="text-base lg:text-lg font-black uppercase tracking-widest italic bg-clip-text text-transparent inline-block"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                backgroundImage: 'linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #00bfff, #8000ff, #ff00ff)',
                filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.5)) drop-shadow(2px 3px 4px rgba(0,0,0,0.6))',
              }}
            >
              🎬 Enjoy the full world of Luo cinema, perfectly translated by Luo Ancient 🎬
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

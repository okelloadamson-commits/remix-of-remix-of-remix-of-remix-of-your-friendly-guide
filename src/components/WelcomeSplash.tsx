import { useState, useEffect } from "react";
import welcomeSound from "@/assets/notifica.mp3";

const COLORS = [
  "#ff3e3e", "#ff9e00", "#ffe600", "#00e676", "#00b0ff",
  "#d500f9", "#ff1744", "#76ff03", "#00e5ff", "#ffea00",
  "#f50057", "#651fff", "#18ffff", "#ffd740", "#ff6e40",
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  opacity: number;
}

function createParticles(cx: number, cy: number, count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: cx,
    y: cy,
    color: randomColor(),
    size: Math.random() * 8 + 3,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7,
    speed: Math.random() * 400 + 150,
    opacity: 1,
  }));
}

export function WelcomeSplash() {
  const shouldShow = (() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;
    if (path.startsWith("/genres")) return false;
    try {
      if (sessionStorage.getItem("welcome_shown") === "1") return false;
    } catch {}
    return true;
  })();
  const [visible, setVisible] = useState(shouldShow);
  const [phase, setPhase] = useState<"text" | "explode" | "gone">("text");
  const [colorIndex, setColorIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (shouldShow) sessionStorage.setItem("welcome_shown", "1");
  }, [shouldShow]);

  // Play welcome sound (with autoplay-block fallback)
  useEffect(() => {
    if (!visible) return;
    const audio = new Audio(welcomeSound);
    audio.volume = 1;
    audio.preload = "auto";

    let started = false;
    const events: (keyof WindowEventMap)[] = ["click", "touchstart", "keydown", "pointerdown", "scroll", "mousemove"];
    const cleanupListeners = () => events.forEach((e) => window.removeEventListener(e, kick));

    function kick() {
      tryPlay();
    }

    const tryPlay = () => {
      if (started) return;
      audio.muted = false;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          started = true;
          cleanupListeners();
        }).catch(() => {});
      }
    };

    tryPlay();
    events.forEach((e) => window.addEventListener(e, kick, { passive: true } as any));

    return () => {
      cleanupListeners();
      // let the sound finish playing even after the splash disappears
    };
  }, [visible]);


  // Color cycling for text
  useEffect(() => {
    if (phase !== "text") return;
    const interval = setInterval(() => setColorIndex((i) => i + 1), 200);
    return () => clearInterval(interval);
  }, [phase]);

  // Trigger explosion after 5s
  useEffect(() => {
    if (!visible || phase !== "text") return;
    const timer = setTimeout(() => {
      // Generate particles from center
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setParticles(createParticles(cx, cy, 120));
      setPhase("explode");
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, phase]);

  // Remove after explosion animation
  useEffect(() => {
    if (phase !== "explode") return;
    const timer = setTimeout(() => {
      setPhase("gone");
      setTimeout(() => setVisible(false), 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  if (!visible) return null;

  const getColor = (offset: number) => COLORS[(colorIndex + offset) % COLORS.length];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 transition-opacity duration-400 ${
        phase === "gone" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Text phase */}
      {phase === "text" && (
        <div className="flex flex-col items-center">
          <div className="text-center animate-fade-in select-none" style={{ fontFamily: "'Alien Encounters', sans-serif" }}>
            <div
              className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none transition-colors duration-200"
              style={{ color: getColor(0), textShadow: `0 0 40px ${getColor(0)}80` }}
            >
              WELCOME
            </div>
            <div
              className="text-3xl sm:text-5xl md:text-6xl font-bold mt-2 transition-colors duration-200"
              style={{ color: getColor(3), textShadow: `0 0 30px ${getColor(3)}80` }}
            >
              TO
            </div>
            <div
              className="text-4xl sm:text-6xl md:text-7xl font-black mt-3 tracking-wide transition-colors duration-200"
              style={{ color: getColor(6), textShadow: `0 0 40px ${getColor(6)}80` }}
            >
              LUO ANCIENT
            </div>
            <div
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-wide transition-colors duration-200"
              style={{ color: getColor(9), textShadow: `0 0 40px ${getColor(9)}80` }}
            >
              MOVIES
            </div>
          </div>
        </div>

      )}


      {/* Explosion phase - firework particles */}
      {phase === "explode" && (
        <>
          {/* Text shattering apart */}
          <div className="text-center absolute" style={{
            fontFamily: "'Alien Encounters', sans-serif",
          }}>
            {["WELCOME", "TO", "LUO ANCIENT", "MOVIES"].map((word, wi) => (
              <div key={wi} className="overflow-visible">
                {word.split("").map((char, ci) => {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 300 + Math.random() * 400;
                  const tx = Math.cos(angle) * dist;
                  const ty = Math.sin(angle) * dist;
                  const rot = (Math.random() - 0.5) * 720;
                  const delay = ci * 30 + wi * 60;
                  const color = getColor(wi * 3 + ci);
                  const sizeClass = wi === 0 ? "text-5xl sm:text-7xl md:text-8xl" :
                    wi === 1 ? "text-3xl sm:text-5xl md:text-6xl" :
                    "text-4xl sm:text-6xl md:text-7xl";
                  return (
                    <span
                      key={ci}
                      className={`${sizeClass} font-black inline-block`}
                      style={{
                        color,
                        textShadow: `0 0 40px ${color}`,
                        animation: `char-explode-${wi}-${ci} 1.2s ${delay}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                      }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Inject character explosion keyframes */}
          <style>{
            ["WELCOME", "TO", "LUO ANCIENT", "MOVIES"].flatMap((word, wi) =>
              word.split("").map((_, ci) => {
                const angle = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 400;
                const tx = Math.cos(angle) * dist;
                const ty = Math.sin(angle) * dist;
                const rot = (Math.random() - 0.5) * 720;
                return `@keyframes char-explode-${wi}-${ci} {
                  0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
                  60% { opacity: 1; }
                  100% { transform: translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(0.2); opacity: 0; }
                }`;
              })
            ).join("\n")
          }</style>

          {/* Firework particles burst after letters scatter */}
          {particles.map((p) => {
            const endX = Math.cos(p.angle) * p.speed;
            const endY = Math.sin(p.angle) * p.speed;
            return (
              <div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 ${p.size * 3}px ${p.color}, 0 0 ${p.size * 6}px ${p.color}80`,
                  left: "50%",
                  top: "50%",
                  animation: `particle-fly-${p.id} 1.8s 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                  opacity: 0,
                }}
              />
            );
          })}
          <style>{particles.map((p) => {
            const endX = Math.cos(p.angle) * p.speed;
            const endY = Math.sin(p.angle) * p.speed;
            return `@keyframes particle-fly-${p.id} {
              0% { transform: translate(0, 0); opacity: 1; }
              100% { transform: translate(${endX}px, ${endY}px); opacity: 0; }
            }`;
           }).join("\n")}</style>
        </>
      )}
    </div>
  );
}

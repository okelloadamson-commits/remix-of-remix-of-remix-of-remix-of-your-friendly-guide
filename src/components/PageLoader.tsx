import { useEffect, useState } from "react";

interface PageLoaderProps {
  label: string;
}

const DOT_COUNT = 24;
const BLUE = "#1e90ff";
const BLUE_GLOW = "#4dc0ff";

export function PageLoader({ label }: PageLoaderProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % DOT_COUNT), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-center w-full" style={{ minHeight: "60vh" }}>
      <div className="relative" style={{ width: 320, height: 320 }}>
        {Array.from({ length: DOT_COUNT }).map((_, i) => {
          const angle = (i / DOT_COUNT) * Math.PI * 2 - Math.PI / 2;
          const r = 130;
          const x = Math.cos(angle) * r + 160;
          const y = Math.sin(angle) * r + 160;
          const dist = (i - tick + DOT_COUNT) % DOT_COUNT;
          const intensity = Math.max(0, 1 - dist / 10);
          const size = 6 + intensity * 14;
          const opacity = 0.15 + intensity * 0.85;
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: x,
                top: y,
                width: size,
                height: size,
                transform: "translate(-50%, -50%)",
                backgroundColor: BLUE_GLOW,
                opacity,
                boxShadow: `0 0 ${size * 1.5}px ${BLUE}, 0 0 ${size * 3}px ${BLUE}`,
                transition: "width 80ms linear, height 80ms linear, opacity 80ms linear",
              }}
            />
          );
        })}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center select-none"
          style={{ color: BLUE, textShadow: `0 0 20px ${BLUE}, 0 0 40px ${BLUE}` }}
        >
          <div className="text-3xl sm:text-4xl font-bold tracking-[0.3em]">LOADING</div>
          <div className="text-xl sm:text-2xl font-semibold tracking-[0.3em] mt-2">{label}</div>
        </div>
      </div>
    </div>
  );
}
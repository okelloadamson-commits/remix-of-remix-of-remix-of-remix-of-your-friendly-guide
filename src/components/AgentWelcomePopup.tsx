interface Props {
  lines?: string[];
}

export function AgentWelcomePopup({
  lines = ["BE AMONG", "AGENT OF THE WEEK"],
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 pointer-events-none px-4 neon-popup-fade">
      <svg
        viewBox="0 0 2600 480"
        className="w-full max-w-6xl h-auto neon-hue-cycle"
        style={{ filter: "url(#neon-glow)" }}
      >
        <defs>
          <filter id="neon-glow" x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="1.5" result="b1" />
            <feGaussianBlur stdDeviation="5" result="b2" />
            <feGaussianBlur stdDeviation="14" result="b3" />
            <feMerge>
              <feMergeNode in="b3" />
              <feMergeNode in="b3" />
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="neon-rainbow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffd000" />
            <stop offset="20%" stopColor="#ff00d4" />
            <stop offset="40%" stopColor="#00b3ff" />
            <stop offset="60%" stopColor="#a200ff" />
            <stop offset="80%" stopColor="#ff00aa" />
            <stop offset="100%" stopColor="#ffd000" />
            <animate
              attributeName="x1"
              values="-1;1"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="x2"
              values="0;2"
              dur="3s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>

        <text
          x="50%"
          y="35%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="none"
          stroke="url(#neon-rainbow)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="agent-welcome-text"
          style={{
            fontFamily: "'Impact', 'Arial Black', sans-serif",
            fontWeight: 900,
            letterSpacing: 4,
          }}
        >
          {lines.map((line, i) => (
            <tspan
              key={i}
              x="50%"
              dy={i === 0 ? "0" : "1.15em"}
            >
              {line}
            </tspan>
          ))}
        </text>
      </svg>
    </div>
  );
}

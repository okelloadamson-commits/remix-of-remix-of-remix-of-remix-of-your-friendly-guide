import { useEffect, useRef, useState, useCallback } from "react";

interface SlingshotTitleProps {
  text: string;
  className?: string;
}

/**
 * A title that behaves like a real slingshot/rubber band.
 * Press & drag the text — two rubber bands stretch from anchor points
 * to a "pouch" holding the text. Release to snap it back with a
 * springy 3D wobble.
 */
export function SlingshotTitle({ text, className = "" }: SlingshotTitleProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 260, h: 48 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      const r = wrapRef.current!.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    setSnapping(false);
    setDragging(true);
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    // Limit stretch with a soft cap (rubber-band feel)
    const cap = 140;
    const soften = (v: number) => {
      const sign = Math.sign(v);
      const a = Math.abs(v);
      return sign * (a < cap ? a : cap + (a - cap) * 0.25);
    };
    setPos({ x: soften(startRef.current.px + dx), y: soften(startRef.current.py + dy) });
  }, [dragging]);

  const release = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    setSnapping(true);
    setPos({ x: 0, y: 0 });
    window.setTimeout(() => setSnapping(false), 900);
  }, [dragging]);

  // Anchor points (left & right of the title bounds)
  const padX = 14;
  const padY = 10;
  const svgW = size.w + padX * 2;
  const svgH = size.h + padY * 2 + Math.max(80, Math.abs(pos.y) + 40);
  const leftAnchor = { x: padX, y: padY + size.h / 2 };
  const rightAnchor = { x: svgW - padX, y: padY + size.h / 2 };
  const pouch = { x: svgW / 2 + pos.x, y: padY + size.h / 2 + pos.y };

  const stretch = Math.hypot(pos.x, pos.y);
  const tilt = Math.max(-25, Math.min(25, pos.x / 6));
  const pitch = Math.max(-20, Math.min(20, -pos.y / 7));
  const tension = Math.min(1, stretch / 160);

  const transition = snapping
    ? "transform 0.7s cubic-bezier(0.34, 1.8, 0.4, 1)"
    : dragging
    ? "none"
    : "transform 0.25s ease-out";

  return (
    <span
      ref={wrapRef}
      className={`relative inline-block select-none ${className}`}
      style={{ perspective: "600px", touchAction: "none" }}
    >
      {/* Invisible sizer keeps layout stable while the visible text is absolutely positioned */}
      <span className="invisible whitespace-nowrap" aria-hidden>
        {text}
      </span>

      {/* Rubber band SVG layer */}
      <svg
        className="pointer-events-none absolute"
        style={{
          left: -padX,
          top: -padY,
          width: svgW,
          height: svgH,
          overflow: "visible",
        }}
        aria-hidden
      >
        <defs>
          <linearGradient id="bandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(0 84% 60%)" />
            <stop offset="50%" stopColor="hsl(25 95% 53%)" />
            <stop offset="100%" stopColor="hsl(0 84% 60%)" />
          </linearGradient>
        </defs>
        {/* Left band */}
        <line
          x1={leftAnchor.x}
          y1={leftAnchor.y}
          x2={pouch.x}
          y2={pouch.y}
          stroke="url(#bandGrad)"
          strokeWidth={2 + tension * 2}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 ${4 + tension * 6}px hsl(0 84% 60% / ${0.4 + tension * 0.5}))` }}
        />
        {/* Right band */}
        <line
          x1={rightAnchor.x}
          y1={rightAnchor.y}
          x2={pouch.x}
          y2={pouch.y}
          stroke="url(#bandGrad)"
          strokeWidth={2 + tension * 2}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 ${4 + tension * 6}px hsl(25 95% 53% / ${0.4 + tension * 0.5}))` }}
        />
        {/* Anchor posts */}
        <circle cx={leftAnchor.x} cy={leftAnchor.y} r={4} fill="hsl(0 84% 60%)" />
        <circle cx={rightAnchor.x} cy={rightAnchor.y} r={4} fill="hsl(25 95% 53%)" />
      </svg>

      {/* The "pouch" — the draggable text */}
      <span
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        className="absolute inset-0 cursor-grab active:cursor-grabbing whitespace-nowrap"
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotateY(${tilt}deg) rotateX(${pitch}deg) scale(${1 + tension * 0.05})`,
          transformStyle: "preserve-3d",
          transition,
          textShadow: dragging || snapping
            ? `0 ${4 + tension * 8}px ${10 + tension * 14}px hsl(0 84% 60% / ${0.35 + tension * 0.4})`
            : undefined,
          willChange: "transform",
        }}
      >
        {text}
      </span>
    </span>
  );
}

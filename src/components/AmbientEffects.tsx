import { useMemo } from "react";

type Particle = {
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

export function AmbientEffects() {
  const particles = useMemo<Particle[]>(() => {
    // Stable positions (no re-randomization each render)
    const seed = [
      0.12, 0.78, 0.33, 0.91, 0.55, 0.24, 0.67, 0.41, 0.86, 0.19,
      0.73, 0.06, 0.48, 0.95, 0.29, 0.62, 0.14, 0.84, 0.37, 0.58,
    ];

    return Array.from({ length: 18 }).map((_, i) => {
      const a = seed[i % seed.length];
      const b = seed[(i + 5) % seed.length];
      const c = seed[(i + 9) % seed.length];
      const d = seed[(i + 13) % seed.length];

      return {
        left: `${Math.round(a * 100)}%`,
        top: `${Math.round(b * 100)}%`,
        size: 2 + Math.round(c * 3),
        duration: 10 + Math.round(d * 14),
        delay: Math.round(a * 6),
        opacity: 0.15 + c * 0.25,
      };
    });
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Soft moving blobs */}
      <div className="absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl animate-float-orb" />
      <div className="absolute top-32 -right-24 h-[26rem] w-[26rem] rounded-full bg-secondary/10 blur-3xl animate-float-orb" style={{ animationDelay: "-2s" }} />
      <div className="absolute -bottom-24 left-1/3 h-[30rem] w-[30rem] rounded-full bg-accent/10 blur-3xl animate-float-orb" style={{ animationDelay: "-4s" }} />

      {/* Subtle grid shimmer */}
      <div className="absolute inset-0 opacity-[0.08] bg-grid-pattern animate-grid-move" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary animate-particle-float"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/40" />
    </div>
  );
}

import { cn } from "@/lib/utils";

interface BulbIconProps {
  className?: string;
  animated?: boolean;
}

export const BulbIcon = ({ className, animated = false }: BulbIconProps) => {
  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        viewBox="0 0 100 100"
        className={cn(
          "w-full h-full",
          animated && "bulb-glow"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bulbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--tech-blue))" />
            <stop offset="50%" stopColor="hsl(var(--tech-purple))" />
            <stop offset="100%" stopColor="hsl(var(--bulb-glow))" />
          </linearGradient>
        </defs>
        
        {/* Bulb outline */}
        <path
          d="M50 10 C65 10, 75 25, 75 40 C75 50, 70 58, 65 62 L65 70 L35 70 L35 62 C30 58, 25 50, 25 40 C25 25, 35 10, 50 10 Z"
          stroke="url(#bulbGradient)"
          strokeWidth="2"
          fill="none"
        />
        
        {/* Filament lines */}
        <path
          d="M40 25 Q50 35, 60 25"
          stroke="hsl(var(--bulb-glow))"
          strokeWidth="1.5"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M40 35 Q50 45, 60 35"
          stroke="hsl(var(--bulb-glow))"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        
        {/* Base */}
        <rect
          x="35"
          y="70"
          width="30"
          height="8"
          fill="url(#bulbGradient)"
          rx="2"
        />
        <rect
          x="37"
          y="78"
          width="26"
          height="6"
          fill="hsl(var(--muted))"
          rx="1"
        />
        
        {/* Glow effect */}
        <circle
          cx="50"
          cy="40"
          r="20"
          fill="hsl(var(--bulb-glow) / 0.1)"
          className={animated ? "animate-pulse" : ""}
        />
      </svg>
    </div>
  );
};
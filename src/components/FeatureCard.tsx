import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient?: string;
  className?: string;
}

export const FeatureCard = ({ 
  title, 
  description, 
  icon: Icon, 
  className 
}: FeatureCardProps) => {
  return (
    <Card className={cn(
      "group relative p-8 border border-border/50",
      "bg-gradient-to-br from-card to-card/80",
      "backdrop-blur-sm overflow-hidden",
      "transition-all duration-500 ease-out",
      "hover:border-bulb-glow/30",
      className
    )}>
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-tech-blue/5 to-tech-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-bulb-glow/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      <div className="relative z-10">
        <div className="mb-6 inline-flex p-4 rounded-2xl bg-gradient-to-br from-tech-blue/20 to-bulb-glow/20 border border-border/50 group-hover:scale-110 group-hover:border-bulb-glow/30 transition-all duration-300">
          <Icon className="h-8 w-8 text-bulb-glow group-hover:animate-pulse" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-gradient transition-all duration-300">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
      
      {/* Bottom border glow on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-bulb-glow/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Card>
  );
};

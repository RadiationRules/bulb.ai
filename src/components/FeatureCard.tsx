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
      "relative p-8 card-hover border border-border/50",
      "bg-gradient-to-br from-card to-card/80",
      "backdrop-blur-sm",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-tech-blue/10 to-tech-purple/10 rounded-lg" />
      <div className="relative z-10">
        <div className="mb-6 inline-flex p-3 rounded-xl bg-gradient-to-br from-tech-blue/20 to-bulb-glow/20">
          <Icon className="h-8 w-8 text-bulb-glow" />
        </div>
        <h3 className="text-2xl font-bold mb-4 text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Card>
  );
};
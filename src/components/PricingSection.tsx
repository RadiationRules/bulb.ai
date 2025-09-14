import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Star, Crown } from "lucide-react";
import { BulbIcon } from "./BulbIcon";

interface PricingSectionProps {
  onUpgrade: () => void;
}

export const PricingSection = ({ onUpgrade }: PricingSectionProps) => {
  const freeFeatures = [
    "5 chat sessions per day",
    "Basic AI assistance",
    "Community support",
    "Standard response time"
  ];

  const premiumFeatures = [
    "Unlimited chat sessions",
    "Advanced AI assistance",
    "Priority support",
    "Faster response times",
    "Advanced code analysis",
    "Premium brainstorming tools",
    "Export conversation history",
    "Custom AI personality"
  ];

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Choose Your 
            <span className="bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
              {" "}Innovation Level
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start free and upgrade when you're ready to unlock the full power of BulbAI
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="relative p-8 border border-border/50 bg-gradient-to-br from-card to-card/80">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <BulbIcon className="w-8 h-8" />
                <h3 className="text-2xl font-bold text-foreground">Free</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">Perfect for getting started with AI assistance</p>
            </div>

            <ul className="space-y-3 mb-8">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-bulb-glow flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              variant="outline" 
              className="w-full border-border hover:bg-secondary/50"
              disabled
            >
              Current Plan
            </Button>
          </Card>

          {/* Premium Plan */}
          <Card className="relative p-8 border-2 border-tech-blue bg-gradient-to-br from-card to-card/80 card-hover">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="tech-gradient text-white px-4 py-1">
                <Crown className="w-4 h-4 mr-1" />
                Most Popular
              </Badge>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <BulbIcon className="w-8 h-8" animated />
                <h3 className="text-2xl font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
                  Premium
                </h3>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-foreground">$4.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground">Unlimited AI power for serious creators</p>
            </div>

            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-tech-blue flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              onClick={onUpgrade}
              className="w-full tech-gradient hover:opacity-90 transition-opacity text-lg py-6"
            >
              <Zap className="mr-2 h-5 w-5" />
              Upgrade to Premium
            </Button>
          </Card>
        </div>

        <div className="text-center mt-12">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 text-bulb-glow" />
            <span>30-day money back guarantee</span>
            <Star className="h-4 w-4 text-bulb-glow" />
          </div>
        </div>
      </div>
    </section>
  );
};
import { Button } from "@/components/ui/button";
import { BulbIcon } from "./BulbIcon";

export const Navigation = () => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BulbIcon className="w-8 h-8" animated />
          <span className="text-2xl font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
            BulbAI
          </span>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-foreground hover:text-bulb-glow transition-colors">Features</a>
          <a href="#about" className="text-foreground hover:text-bulb-glow transition-colors">About</a>
          <a href="#contact" className="text-foreground hover:text-bulb-glow transition-colors">Contact</a>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            className="border-border hover:bg-secondary/50 hover:border-tech-blue transition-all"
          >
            Sign In
          </Button>
          <Button className="tech-gradient hover:opacity-90 transition-opacity">
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
};
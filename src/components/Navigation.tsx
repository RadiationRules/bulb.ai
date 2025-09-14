import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BulbIcon } from "./BulbIcon";
import { AuthModal } from "./AuthModal";
import { auth, logout } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { LogOut, User as UserIcon } from "lucide-react";

export const Navigation = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleGetStarted = () => {
    if (user) {
      // User is logged in, scroll to chat or open chat interface
      document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowAuthModal(true);
    }
  };

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
          {user ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-bulb-glow" />
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="border-border hover:bg-secondary/50 hover:border-tech-blue transition-all"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setShowAuthModal(true)}
                className="border-border hover:bg-secondary/50 hover:border-tech-blue transition-all"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="tech-gradient hover:opacity-90 transition-opacity"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
      
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </nav>
  );
};
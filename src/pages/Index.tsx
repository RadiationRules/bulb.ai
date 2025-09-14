import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { BulbIcon } from "@/components/BulbIcon";
import { FeatureCard } from "@/components/FeatureCard";
import { ChatInterface } from "@/components/ChatInterface";
import { AuthModal } from "@/components/AuthModal";
import { PricingSection } from "@/components/PricingSection";
import { Code, Lightbulb, Hammer, Zap, Brain, Rocket, MessageCircle, Play, AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import heroImage from "@/assets/hero-bulbai.jpg";

const Index = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      setShowChat(true);
      setIsChatFullscreen(true);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleWatchDemo = () => {
    // For demo, just show the chat interface
    setShowChat(true);
    setIsChatFullscreen(true);
  };

  const handleChatClose = () => {
    setShowChat(false);
    setIsChatFullscreen(false);
  };

  const handleToggleFullscreen = () => {
    if (!showChat) {
      setShowChat(true);
      setIsChatFullscreen(true);
    } else {
      setIsChatFullscreen(!isChatFullscreen);
    }
  };

  const handleUpgrade = () => {
    // Show alert about needing Supabase for premium features
    alert("To enable premium subscriptions, you'll need to connect to Supabase first. This allows secure payment processing and subscription management.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Supabase Integration Notice */}
      <div className="fixed top-20 left-4 right-4 z-40 max-w-md mx-auto">
        <Alert className="border-bulb-glow/50 bg-card/95 backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 text-bulb-glow" />
          <AlertDescription className="text-sm">
            <strong>Premium Features Ready!</strong> Connect to Supabase to enable $4.99/month subscriptions with unlimited AI chat.
          </AlertDescription>
        </Alert>
      </div>

      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background to-background/50" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start mb-6">
                <BulbIcon className="w-16 h-16 mr-4" animated />
                <h1 className="text-5xl lg:text-7xl font-bold">
                  <span className="bg-gradient-to-r from-tech-blue via-tech-purple to-bulb-glow bg-clip-text text-transparent">
                    BulbAI
                  </span>
                </h1>
              </div>
              
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
                Illuminate Your Ideas with
                <span className="text-bulb-glow"> AI-Powered Innovation</span>
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                Transform your creative process with BulbAI - the intelligent platform that assists you in 
                <span className="text-tech-blue font-semibold"> Building</span>, 
                <span className="text-tech-purple font-semibold"> Brainstorming</span>, and 
                <span className="text-bulb-glow font-semibold"> Coding</span>. 
                Light up your potential today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="tech-gradient hover:opacity-90 transition-opacity text-lg px-8 py-6"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Start Creating Now
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleWatchDemo}
                  className="border-tech-blue text-tech-blue hover:bg-tech-blue/10 text-lg px-8 py-6"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Try BulbAI Now
                </Button>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <img 
                src={heroImage}
                alt="BulbAI Hero - AI Innovation Visualization"
                className="rounded-2xl shadow-2xl w-full max-w-2xl mx-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Three Pillars of 
              <span className="bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
                {" "}Innovation
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              BulbAI empowers creators, developers, and innovators with AI-driven assistance across three core domains
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <FeatureCard
              icon={Hammer}
              title="Building"
              description="From architecture to app development, BulbAI provides intelligent guidance for constructing your visions into reality with precision and creativity."
            />
            <FeatureCard
              icon={Brain}
              title="Brainstorming"
              description="Unlock limitless creativity with AI-powered ideation. Generate, refine, and explore concepts that push the boundaries of innovation."
            />
            <FeatureCard
              icon={Code}
              title="Coding"
              description="Accelerate your development with intelligent code assistance. From debugging to architecture, BulbAI is your coding companion."
            />
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center p-6 rounded-xl bg-gradient-to-br from-card to-card/80 border border-border/50">
              <Lightbulb className="h-8 w-8 text-bulb-glow mr-4" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Smart Insights</h4>
                <p className="text-sm text-muted-foreground">AI-powered analysis and recommendations</p>
              </div>
            </div>
            <div className="flex items-center p-6 rounded-xl bg-gradient-to-br from-card to-card/80 border border-border/50">
              <Rocket className="h-8 w-8 text-tech-blue mr-4" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Rapid Prototyping</h4>
                <p className="text-sm text-muted-foreground">Quick idea-to-implementation pipeline</p>
              </div>
            </div>
            <div className="flex items-center p-6 rounded-xl bg-gradient-to-br from-card to-card/80 border border-border/50">
              <Zap className="h-8 w-8 text-tech-purple mr-4" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Lightning Fast</h4>
                <p className="text-sm text-muted-foreground">Instant responses and real-time collaboration</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection onUpgrade={handleUpgrade} />

      {/* Chat Section */}
      <section id="chat-section" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-tech-blue/10 via-tech-purple/10 to-bulb-glow/10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <BulbIcon className="w-20 h-20 mx-auto mb-8" animated />
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Ready to Illuminate Your Ideas?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {user 
              ? "Welcome back! Start chatting with BulbAI to get intelligent assistance."
              : "Join thousands of creators who are already using BulbAI to transform their creative process"
            }
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="tech-gradient hover:opacity-90 transition-opacity text-lg px-12 py-6"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            {user ? "Start Chatting" : "Get Started Free"}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <BulbIcon className="w-8 h-8" />
              <span className="text-2xl font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
                BulbAI
              </span>
            </div>
            <div className="text-center text-muted-foreground">
              <p>&copy; 2024 BulbAI. Illuminating innovation with artificial intelligence.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />

      {/* Chat Interface */}
      {showChat && (
        <ChatInterface
          isFullscreen={isChatFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onClose={handleChatClose}
        />
      )}

      {/* Chat Button (when not in fullscreen) */}
      {!showChat && (
        <Button
          onClick={handleToggleFullscreen}
          className="fixed bottom-6 right-6 z-50 rounded-full w-16 h-16 tech-gradient shadow-2xl hover:scale-110 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default Index;
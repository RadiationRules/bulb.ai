import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { BulbIcon } from "@/components/BulbIcon";
import { FeatureCard } from "@/components/FeatureCard";
import { ChatInterface } from "@/components/ChatInterface";
import { useAuth } from "@/hooks/useAuth";

import { Code, Lightbulb, Hammer, Zap, Brain, Rocket, MessageCircle } from "lucide-react";
import heroImage from "@/assets/hero-bulbai.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleWatchDemo = () => {
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
        <div className="grid-background" />
      </div>

      <div className="relative z-10">
        <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background to-background/50" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start mb-6 opacity-0 animate-fade-in-left">
                <BulbIcon className="w-16 h-16 mr-4 animate-scale-in animation-delay-200" animated />
                <h1 className="text-5xl lg:text-7xl font-bold animate-fade-in-right animation-delay-400">
                  <span className="bg-gradient-to-r from-tech-blue via-tech-purple to-bulb-glow bg-clip-text text-transparent">
                    BulbAI
                  </span>
                </h1>
              </div>
              
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-foreground leading-tight opacity-0 animate-fade-in-up animation-delay-600">
                Your Complete Development Platform
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl opacity-0 animate-fade-in-up animation-delay-800">
                Build, collaborate, and deploy projects with AI assistance. Join thousands of developers creating amazing applications.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start opacity-0 animate-fade-in-up animation-delay-1000">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="tech-gradient button-hover-glow text-lg px-8 py-6 shadow-lg"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  {user ? "Open Dashboard" : "Get Started Free"}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleWatchDemo}
                  className="text-lg px-8 py-6"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Try AI Assistant
                </Button>
              </div>
            </div>
            
            <div className="flex-1 relative opacity-0 animate-fade-in-right animation-delay-800">
              <img 
                src={heroImage}
                alt="BulbAI Development Platform"
                className="rounded-2xl shadow-2xl w-full max-w-2xl mx-auto hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Everything You Need to Build
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              From idea to deployment - BulbAI provides all the tools for modern development
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <FeatureCard
              icon={Code}
              title="AI-Powered Workspace"
              description="Code with intelligent assistance. Get real-time suggestions, debugging help, and architecture guidance from our AI copilot."
            />
            <FeatureCard
              icon={Brain}
              title="Project Management"
              description="Organize your projects, collaborate with others, and track your progress. Public and private projects supported."
            />
            <FeatureCard
              icon={Rocket}
              title="Instant Deployment"
              description="Deploy your projects instantly with our integrated hosting. Share your work with the world in just one click."
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center p-6 rounded-xl bg-gradient-to-br from-card to-card/80 border border-border/50">
              <Lightbulb className="h-8 w-8 text-bulb-glow mr-4" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Smart Insights</h4>
                <p className="text-sm text-muted-foreground">AI-powered code analysis and optimization</p>
              </div>
            </div>
            <div className="flex items-center p-6 rounded-xl bg-gradient-to-br from-card to-card/80 border border-border/50">
              <Hammer className="h-8 w-8 text-tech-blue mr-4" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Full-Stack Support</h4>
                <p className="text-sm text-muted-foreground">Frontend, backend, and database tools</p>
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

      {/* CTA Section */}
      <section id="cta-section" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-tech-blue/10 via-tech-purple/10 to-bulb-glow/10" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <BulbIcon className="w-20 h-20 mx-auto mb-8" animated />
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Ready to Start Building?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {user 
              ? "Welcome back! Continue working on your projects."
              : "Join thousands of developers building the future with BulbAI"
            }
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            className="tech-gradient hover:opacity-90 transition-all duration-300 hover:scale-105 text-lg px-12 py-6 shadow-lg hover:shadow-xl"
          >
            {user ? "Continue Building" : "Start Your Journey"}
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
              <p>&copy; 2025 BulbAI. Building the future of development.</p>
            </div>
          </div>
        </div>
      </footer>
      </div>

      {/* Chat Interface */}
      {showChat && (
        <ChatInterface
          isFullscreen={isChatFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onClose={handleChatClose}
        />
      )}
    </div>
  );
};

export default Index;
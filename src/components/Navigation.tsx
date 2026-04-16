import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BulbIcon } from "./BulbIcon";
import { AuthModal } from "./AuthModal";
import { SettingsModal } from "./SettingsModal";
import { ProfileModal } from "./ProfileModal";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { ApiConfigModal } from "./ApiConfigModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User as UserIcon, Menu, X, Settings, Brain, MessageCircle, Folder, Key, Crown, Gift, Layers } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const Navigation = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLanding = location.pathname === '/';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleLogoClick = () => {
    if (isLanding) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleFeaturesClick = () => {
    if (isLanding) {
      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#features');
    }
  };

  const handleAIChatClick = () => {
    if (user) {
      navigate('/chat');
    } else if (isLanding) {
      document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#chat-section');
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button onClick={handleLogoClick} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <BulbIcon className="w-8 h-8" animated />
            <span className="text-2xl font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
              BulbAI
            </span>
          </button>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-5">
            <button
              onClick={handleFeaturesClick}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
            >
              <Layers className="h-4 w-4" />
              <span>Features</span>
            </button>
            <button
              onClick={handleAIChatClick}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
            >
              <MessageCircle className="h-4 w-4" />
              <span>AI Chat</span>
            </button>
            {user && (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
              >
                <Folder className="h-4 w-4" />
                <span>Projects</span>
              </button>
            )}
            <button
              onClick={() => navigate('/pricing')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 hover:border-amber-500/70 transition-all duration-300 hover:scale-105 group"
            >
              <Crown className="h-4 w-4 text-amber-500 group-hover:text-amber-400 transition-colors" />
              <span className="text-sm font-semibold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">Pricing</span>
            </button>
            {user && (
              <button
                onClick={() => navigate('/referrals')}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
              >
                <Gift className="h-4 w-4" />
                <span>Referrals</span>
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
          
          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground hidden lg:inline">{profile?.display_name || user.email}</span>
                <Button variant="ghost" size="sm" onClick={() => setShowProfile(true)} className="hover:bg-tech-blue/20" title="Profile">
                  <UserIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowWorkspace(true)} className="hover:bg-tech-purple/20" title="Workspace">
                  <Folder className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowApiConfig(true)} className="hover:bg-bulb-glow/20" title="API Config">
                  <Key className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/20 text-destructive" title="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowAuthModal(true)} className="border-border hover:bg-secondary/50 hover:border-tech-blue transition-all">
                  Sign In
                </Button>
                <Button onClick={handleGetStarted} className="tech-gradient hover:opacity-90 transition-opacity">
                  Get Started Free
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="text-muted-foreground hover:text-foreground">
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border/50">
            <div className="px-2 pt-4 pb-3 space-y-2">
              <button onClick={() => { handleFeaturesClick(); setIsOpen(false); }} className="flex items-center space-x-2 px-3 py-2 w-full text-left text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50">
                <Layers className="h-4 w-4" />
                <span>Features</span>
              </button>
              <button onClick={() => { handleAIChatClick(); setIsOpen(false); }} className="flex items-center space-x-2 px-3 py-2 w-full text-left text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50">
                <MessageCircle className="h-4 w-4" />
                <span>AI Chat</span>
              </button>
              {user && (
                <button onClick={() => { navigate('/dashboard'); setIsOpen(false); }} className="flex items-center space-x-2 px-3 py-2 w-full text-left text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50">
                  <Folder className="h-4 w-4" />
                  <span>Projects</span>
                </button>
              )}
              <button onClick={() => { navigate('/pricing'); setIsOpen(false); }} className="flex items-center space-x-2 px-3 py-2 w-full text-left text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="text-amber-500 font-semibold">Pricing</span>
              </button>
              {user && (
                <button onClick={() => { navigate('/referrals'); setIsOpen(false); }} className="flex items-center space-x-2 px-3 py-2 w-full text-left text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50">
                  <Gift className="h-4 w-4" />
                  <span>Referrals</span>
                </button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="w-full justify-start text-muted-foreground hover:text-foreground px-3 py-2">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              
              <div className="pt-2 border-t border-border/50 mt-2">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground mb-4 px-3">
                      Signed in as {profile?.display_name || user.email}
                    </div>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setShowProfile(true)}>
                      <UserIcon className="h-4 w-4 mr-2" /> Profile
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button variant="outline" onClick={() => setShowAuthModal(true)} className="w-full">Sign In</Button>
                    <Button onClick={handleGetStarted} className="w-full tech-gradient">Get Started Free</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      <ProfileModal open={showProfile} onOpenChange={setShowProfile} />
      <WorkspaceSettings open={showWorkspace} onOpenChange={setShowWorkspace} />
      <ApiConfigModal open={showApiConfig} onOpenChange={setShowApiConfig} />
    </nav>
  );
};

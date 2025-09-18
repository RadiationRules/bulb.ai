import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BulbIcon } from "./BulbIcon";
import { AuthModal } from "./AuthModal";
import { SettingsModal } from "./SettingsModal";
import { ProfileModal } from "./ProfileModal";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { ApiConfigModal } from "./ApiConfigModal";
import { auth, logout } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { LogOut, User as UserIcon, Menu, X, Settings, Brain, MessageCircle, Folder, Key } from "lucide-react";

export const Navigation = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BulbIcon className="w-8 h-8" animated />
            <span className="text-2xl font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
              BulbAI
            </span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1">
              <Brain className="h-4 w-4" />
              <span>Features</span>
            </a>
            <a href="#chat-section" className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>AI Chat</span>
            </a>
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
                <span className="text-sm text-muted-foreground hidden lg:inline">{user.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile(true)}
                  className="hover:bg-tech-blue/20"
                  title="Profile"
                >
                  <UserIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWorkspace(true)}
                  className="hover:bg-tech-purple/20"
                  title="Workspace"
                >
                  <Folder className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiConfig(true)}
                  className="hover:bg-bulb-glow/20"
                  title="API Config"
                >
                  <Key className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="hover:bg-tech-blue/20"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="hover:bg-destructive/20 text-destructive"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
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

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border/50">
            <div className="px-2 pt-4 pb-3 space-y-2">
              <a href="#features" className="flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50">
                <Brain className="h-4 w-4" />
                <span>Features</span>
              </a>
              <a href="#chat-section" className="flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/50">
                <MessageCircle className="h-4 w-4" />
                <span>AI Chat</span>
              </a>
              <Button
                variant="ghost"
                size="sm" 
                onClick={() => setShowSettings(true)}
                className="w-full justify-start text-muted-foreground hover:text-foreground px-3 py-2"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              
              {/* Mobile Auth Section */}
              <div className="pt-2 border-t border-border/50 mt-2">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground mb-4 px-3">
                      Signed in as {user.email}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowProfile(true)}
                    >
                      <UserIcon className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowWorkspace(true)}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      Workspace
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowApiConfig(true)}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      API Config
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-start border-border hover:bg-secondary/50 hover:border-tech-blue transition-all"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAuthModal(true)}
                      className="w-full border-border hover:bg-secondary/50 hover:border-tech-blue transition-all"
                    >
                      Sign In
                    </Button>
                    <Button 
                      onClick={handleGetStarted}
                      className="w-full tech-gradient hover:opacity-90 transition-opacity"
                    >
                      Get Started
                    </Button>
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
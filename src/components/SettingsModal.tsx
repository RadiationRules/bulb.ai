import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, Palette, Zap, User, Shield, Bell, Monitor, Code2, Cloud } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [chatSpeed, setChatSpeed] = useState([50]);
  const [theme, setTheme] = useState("dark");
  const [settings, setSettings] = useState({
    language: "english",
    timezone: "UTC-8",
    fontSize: "medium",
    autoBackup: true,
    analyticsEnabled: true,
    betaFeatures: false,
    performanceMode: "balanced"
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    if (profile && open) {
      loadUserPreferences();
    }
  }, [profile, open]);

  const loadUserPreferences = async () => {
    try {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (preferences) {
        setTheme(preferences.theme || 'dark');
        setDarkMode(preferences.theme === 'dark');
        if (preferences.ai_settings) {
          const aiSettings = preferences.ai_settings as any;
          setChatSpeed([aiSettings.chatSpeed || 50]);
          setSettings(prev => ({
            ...prev,
            betaFeatures: aiSettings.betaFeatures || false,
            performanceMode: aiSettings.performanceMode || 'balanced'
          }));
        }
        if (preferences.notification_settings) {
          const notificationSettings = preferences.notification_settings as any;
          setNotifications(notificationSettings.enabled !== false);
        }
        if (preferences.editor_settings) {
          const editorSettings = preferences.editor_settings as any;
          setSettings(prev => ({
            ...prev,
            fontSize: editorSettings.fontSize || 'medium',
            language: editorSettings.language || 'english',
            autoBackup: editorSettings.autoSave !== false
          }));
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Auto-save settings with debounce
  const saveSettings = async (showToast = true) => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: profile.id,
          theme: theme,
          notification_settings: { enabled: notifications, animations },
          editor_settings: {
            fontSize: settings.fontSize,
            language: settings.language,
            autoSave: settings.autoBackup
          },
          ai_settings: {
            chatSpeed: chatSpeed[0],
            betaFeatures: settings.betaFeatures,
            performanceMode: settings.performanceMode
          },
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Apply theme immediately
      document.documentElement.className = theme === 'dark' ? 'dark' : '';
      
      if (showToast) {
        toast({
          title: "Settings Saved",
          description: "Your preferences have been updated.",
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to save settings.",
          variant: "destructive"
        });
      }
    }
  };

  // Auto-save when settings change
  useEffect(() => {
    if (!profile || !open) return;
    
    const timeoutId = setTimeout(() => {
      saveSettings(false);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [theme, darkMode, animations, notifications, chatSpeed, settings]);

  const handleSave = async () => {
    setIsLoading(true);
    await saveSettings(true);
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setDarkMode(newTheme === 'dark');
    // Apply immediately for preview
    document.documentElement.className = newTheme === 'dark' ? 'dark' : '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-tech-blue" />
            <span>BulbAI Settings</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="appearance" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="workspace" className="flex items-center space-x-2">
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Code</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center space-x-2">
              <Cloud className="h-4 w-4" />
              <span className="hidden sm:inline">Connect</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Theme & Visual</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <Switch
                    id="dark-mode"
                    checked={darkMode}
                    onCheckedChange={(checked) => {
                      setDarkMode(checked);
                      handleThemeChange(checked ? 'dark' : 'light');
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="animations">Grid Animations</Label>
                  <Switch
                    id="animations"
                    checked={animations}
                    onCheckedChange={setAnimations}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color Theme</Label>
                  <Select value={theme} onValueChange={handleThemeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark Blue</SelectItem>
                      <SelectItem value="light">Light Mode</SelectItem>
                      <SelectItem value="purple">Purple Glow</SelectItem>
                      <SelectItem value="green">Tech Green</SelectItem>
                      <SelectItem value="orange">Innovation Orange</SelectItem>
                      <SelectItem value="neon">Neon Cyber</SelectItem>
                      <SelectItem value="minimal">Minimal Clean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select value={settings.fontSize} onValueChange={(value) => setSettings({...settings, fontSize: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="extra-large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={settings.language} onValueChange={(value) => setSettings({...settings, language: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Español</SelectItem>
                      <SelectItem value="french">Français</SelectItem>
                      <SelectItem value="german">Deutsch</SelectItem>
                      <SelectItem value="chinese">中文</SelectItem>
                      <SelectItem value="japanese">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">AI Performance & Behavior</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Response Speed: {chatSpeed[0]}%</Label>
                  <Slider
                    value={chatSpeed}
                    onValueChange={setChatSpeed}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Performance Mode</Label>
                  <Select value={settings.performanceMode} onValueChange={(value) => setSettings({...settings, performanceMode: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eco">Eco Mode (Energy Saving)</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="performance">High Performance</SelectItem>
                      <SelectItem value="max">Maximum Speed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="beta-features">Beta Features</Label>
                  <Switch 
                    id="beta-features" 
                    checked={settings.betaFeatures}
                    onCheckedChange={(checked) => setSettings({...settings, betaFeatures: checked})}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input id="display-name" defaultValue={profile?.display_name || ''} />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => setSettings({...settings, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="UTC+0">Greenwich Mean Time (UTC+0)</SelectItem>
                      <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>
                      <SelectItem value="UTC+9">Japan Standard Time (UTC+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-backup">Auto Backup Projects</Label>
                  <Switch 
                    id="auto-backup" 
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({...settings, autoBackup: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">Notifications</Label>
                  <Switch 
                    id="notifications" 
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="workspace" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Code Editor Settings</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Default Language</Label>
                    <Select defaultValue="javascript">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="csharp">C#</SelectItem>
                        <SelectItem value="go">Go</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Code Style</Label>
                    <Select defaultValue="prettier">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prettier">Prettier</SelectItem>
                        <SelectItem value="eslint">ESLint</SelectItem>
                        <SelectItem value="standard">StandardJS</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Connected Services</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-[#333] flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold">GitHub</h4>
                      <p className="text-sm text-muted-foreground">Sign in with GitHub for repository access</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'github',
                        options: {
                          redirectTo: window.location.origin,
                          scopes: 'repo read:user user:email'
                        }
                      });
                      if (error) {
                        toast({
                          title: 'Connection Failed',
                          description: 'Check Supabase GitHub OAuth settings',
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    Connect
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  To fix "redirect_uri is not associated" error, add <code className="bg-muted px-1 rounded">{window.location.origin}</code> to your Supabase Auth redirect URLs.
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-tech-purple" />
                Security Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Analytics</Label>
                    <p className="text-sm text-muted-foreground">Help improve BulbAI by sharing anonymous usage data</p>
                  </div>
                  <Switch 
                    checked={settings.analyticsEnabled}
                    onCheckedChange={(checked) => setSettings({...settings, analyticsEnabled: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-save Projects</Label>
                    <p className="text-sm text-muted-foreground">Automatically save your work as you code</p>
                  </div>
                  <Switch 
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({...settings, autoBackup: checked})}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="tech-gradient">
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
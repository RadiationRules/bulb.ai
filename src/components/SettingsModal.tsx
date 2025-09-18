import { useState } from "react";
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
import { Settings, Palette, Zap, User, Shield, Bell, Monitor, Code2, Database, Cloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const { toast } = useToast();
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

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
    onOpenChange(false);
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
          <TabsList className="grid w-full grid-cols-6">
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
                    onCheckedChange={setDarkMode}
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
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark Blue</SelectItem>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="high-contrast">High Contrast Mode</Label>
                    <Switch id="high-contrast" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reduce-motion">Reduce Motion</Label>
                    <Switch id="reduce-motion" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compact-mode">Compact Interface</Label>
                    <Switch id="compact-mode" />
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
                  <Label htmlFor="auto-suggestions">Auto Suggestions</Label>
                  <Switch id="auto-suggestions" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="smart-completion">Smart Code Completion</Label>
                  <Switch id="smart-completion" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="context-awareness">Context Awareness</Label>
                  <Switch id="context-awareness" defaultChecked />
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
              <h3 className="text-lg font-semibold mb-4">Account & Subscription</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-tech-blue/10 border border-tech-blue/20">
                  <div>
                    <h4 className="font-semibold text-foreground">Pro Plan</h4>
                    <p className="text-sm text-muted-foreground">Unlimited AI interactions, priority support</p>
                  </div>
                  <Badge className="bg-tech-blue text-white">Active</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="w-full">
                    Manage Subscription
                  </Button>
                  <Button variant="outline" className="w-full">
                    Billing History
                  </Button>
                  <Button variant="outline" className="w-full">
                    Usage Statistics
                  </Button>
                  <Button variant="outline" className="w-full">
                    Export Data
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input id="display-name" defaultValue="John Developer" />
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-format">Auto Format on Save</Label>
                  <Switch id="auto-format" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="line-numbers">Show Line Numbers</Label>
                  <Switch id="line-numbers" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="minimap">Show Minimap</Label>
                  <Switch id="minimap" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">AI Code Assistance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inline-suggestions">Inline Code Suggestions</Label>
                  <Switch id="inline-suggestions" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-imports">Auto Import Suggestions</Label>
                  <Switch id="auto-imports" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="error-fixing">Auto Error Fixing</Label>
                  <Switch id="error-fixing" />
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
                    <div className="w-8 h-8 rounded bg-tech-blue flex items-center justify-center">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold">GitHub</h4>
                      <p className="text-sm text-muted-foreground">Version control integration</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-tech-purple flex items-center justify-center">
                      <Cloud className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Google Drive</h4>
                      <p className="text-sm text-muted-foreground">Cloud storage sync</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-bulb-glow flex items-center justify-center">
                      <Monitor className="h-4 w-4 text-background" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Slack</h4>
                      <p className="text-sm text-muted-foreground">Team collaboration</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Privacy & Data Control</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates and alerts</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analytics">Usage Analytics</Label>
                    <p className="text-sm text-muted-foreground">Help improve BulbAI with anonymous usage data</p>
                  </div>
                  <Switch 
                    id="analytics" 
                    checked={settings.analyticsEnabled}
                    onCheckedChange={(checked) => setSettings({...settings, analyticsEnabled: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="chat-history">Save Chat History</Label>
                    <p className="text-sm text-muted-foreground">Store conversations for future reference</p>
                  </div>
                  <Switch id="chat-history" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="data-sharing">Share Data for Research</Label>
                    <p className="text-sm text-muted-foreground">Contribute to AI research (fully anonymized)</p>
                  </div>
                  <Switch id="data-sharing" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                  </div>
                  <Select defaultValue="30min">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15min">15 min</SelectItem>
                      <SelectItem value="30min">30 min</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    Download My Data
                  </Button>
                  <Button variant="destructive" className="w-full">
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-muted-foreground">
            Settings are automatically saved
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleSave} className="tech-gradient">
              Save All Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
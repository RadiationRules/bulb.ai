import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, Shield, Zap, Monitor, Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiConfigModal = ({ open, onOpenChange }: ApiConfigModalProps) => {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiConfig, setApiConfig] = useState({
    apiKey: "sk-proj-abc123...",
    endpoint: "https://api.bulbai.com/v1",
    maxTokens: 4000,
    temperature: 0.7,
    rateLimitEnabled: true,
    webhooksEnabled: false,
    debugMode: false
  });

  const handleSave = () => {
    toast({
      title: "API Configuration Saved",
      description: "Your API settings have been updated successfully.",
    });
    onOpenChange(false);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiConfig.apiKey);
    toast({
      title: "API Key Copied",
      description: "API key copied to clipboard.",
    });
  };

  const generateNewApiKey = () => {
    const newKey = `sk-proj-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiConfig({...apiConfig, apiKey: newKey});
    toast({
      title: "New API Key Generated",
      description: "A new API key has been generated. Make sure to save it securely.",
    });
  };

  const apiEndpoints = [
    { name: "Chat Completions", endpoint: "/v1/chat/completions", status: "Active" },
    { name: "Code Generation", endpoint: "/v1/code/generate", status: "Active" },
    { name: "Image Analysis", endpoint: "/v1/vision/analyze", status: "Beta" },
    { name: "Embeddings", endpoint: "/v1/embeddings", status: "Active" },
    { name: "Fine-tuning", endpoint: "/v1/fine-tuning", status: "Coming Soon" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-tech-blue" />
            <span>API Configuration</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="keys" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">API Key Management</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="api-key">Current API Key</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      id="api-key"
                      type={showApiKey ? "text" : "password"}
                      value={apiConfig.apiKey}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyApiKey}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={generateNewApiKey} variant="outline">
                    Generate New Key
                  </Button>
                  <Button variant="destructive" size="sm">
                    Revoke Key
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Configuration Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="endpoint">API Endpoint</Label>
                    <Input
                      id="endpoint"
                      value={apiConfig.endpoint}
                      onChange={(e) => setApiConfig({...apiConfig, endpoint: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      value={apiConfig.maxTokens}
                      onChange={(e) => setApiConfig({...apiConfig, maxTokens: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={apiConfig.temperature}
                      onChange={(e) => setApiConfig({...apiConfig, temperature: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rate-limit">Rate Limiting</Label>
                    <Switch
                      id="rate-limit"
                      checked={apiConfig.rateLimitEnabled}
                      onCheckedChange={(checked) => setApiConfig({...apiConfig, rateLimitEnabled: checked})}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Available Endpoints</h3>
              <div className="space-y-3">
                {apiEndpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                    <div className="flex items-center space-x-4">
                      <Zap className="h-5 w-5 text-tech-blue" />
                      <div>
                        <h4 className="font-semibold text-foreground">{endpoint.name}</h4>
                        <p className="text-sm text-muted-foreground font-mono">{endpoint.endpoint}</p>
                      </div>
                    </div>
                    <Badge variant={endpoint.status === 'Active' ? 'default' : endpoint.status === 'Beta' ? 'secondary' : 'outline'}>
                      {endpoint.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Custom Endpoints</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-endpoint">Custom Endpoint URL</Label>
                  <Input
                    id="custom-endpoint"
                    placeholder="https://your-api.example.com/v1"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-headers">Custom Headers (JSON)</Label>
                  <Textarea
                    id="custom-headers"
                    placeholder='{"Authorization": "Bearer your-token", "X-Custom-Header": "value"}'
                    rows={3}
                  />
                </div>
                <Button variant="outline">
                  Test Connection
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-tech-purple" />
                Security Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>IP Whitelist</Label>
                    <p className="text-sm text-muted-foreground">Restrict API access to specific IP addresses</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Request Signing</Label>
                    <p className="text-sm text-muted-foreground">Require HMAC signatures for requests</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>CORS Enabled</Label>
                    <p className="text-sm text-muted-foreground">Allow cross-origin requests</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Allowed Origins</h3>
              <div className="space-y-2">
                <Input placeholder="https://yourdomain.com" />
                <Input placeholder="https://app.yourdomain.com" />
                <Button variant="outline" size="sm">
                  Add Origin
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Monitor className="h-5 w-5 mr-2 text-bulb-glow" />
                API Monitoring
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-tech-blue mb-1">1,247</div>
                  <div className="text-sm text-muted-foreground">Requests Today</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-tech-purple mb-1">98.5%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-bulb-glow mb-1">142ms</div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                </Card>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Webhook Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications for API events</p>
                  </div>
                  <Switch
                    checked={apiConfig.webhooksEnabled}
                    onCheckedChange={(checked) => setApiConfig({...apiConfig, webhooksEnabled: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Debug Mode</Label>
                    <p className="text-sm text-muted-foreground">Enhanced logging for troubleshooting</p>
                  </div>
                  <Switch
                    checked={apiConfig.debugMode}
                    onCheckedChange={(checked) => setApiConfig({...apiConfig, debugMode: checked})}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="tech-gradient">
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
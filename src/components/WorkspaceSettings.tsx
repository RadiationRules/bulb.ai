import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Folder, Code, Database, Cloud, GitBranch, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkspaceSettings = ({ open, onOpenChange }: WorkspaceSettingsProps) => {
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState({
    name: "My BulbAI Workspace",
    defaultFramework: "react",
    autoSave: true,
    collaborationEnabled: true,
    aiSuggestions: true,
    codeFormatting: "prettier"
  });

  const handleSave = () => {
    toast({
      title: "Workspace Updated",
      description: "Your workspace settings have been saved successfully.",
    });
    onOpenChange(false);
  };

  const projects = [
    { name: "E-commerce Platform", framework: "React", status: "Active", lastModified: "2 hours ago" },
    { name: "AI Dashboard", framework: "Vue", status: "In Progress", lastModified: "1 day ago" },
    { name: "Mobile App Backend", framework: "Node.js", status: "Completed", lastModified: "3 days ago" },
    { name: "Data Visualization Tool", framework: "D3.js", status: "Draft", lastModified: "1 week ago" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Folder className="h-5 w-5 text-tech-blue" />
            <span>Workspace Settings</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Workspace Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="workspace-name">Workspace Name</Label>
                    <Input
                      id="workspace-name"
                      value={workspace.name}
                      onChange={(e) => setWorkspace({...workspace, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Default Framework</Label>
                    <Select value={workspace.defaultFramework} onValueChange={(value) => setWorkspace({...workspace, defaultFramework: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="react">React</SelectItem>
                        <SelectItem value="vue">Vue.js</SelectItem>
                        <SelectItem value="angular">Angular</SelectItem>
                        <SelectItem value="svelte">Svelte</SelectItem>
                        <SelectItem value="nextjs">Next.js</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Code Formatting</Label>
                    <Select value={workspace.codeFormatting} onValueChange={(value) => setWorkspace({...workspace, codeFormatting: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prettier">Prettier</SelectItem>
                        <SelectItem value="eslint">ESLint</SelectItem>
                        <SelectItem value="standardjs">StandardJS</SelectItem>
                        <SelectItem value="custom">Custom Rules</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-save">Auto-save Changes</Label>
                    <Switch
                      id="auto-save"
                      checked={workspace.autoSave}
                      onCheckedChange={(checked) => setWorkspace({...workspace, autoSave: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="collaboration">Enable Collaboration</Label>
                    <Switch
                      id="collaboration"
                      checked={workspace.collaborationEnabled}
                      onCheckedChange={(checked) => setWorkspace({...workspace, collaborationEnabled: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ai-suggestions">AI Code Suggestions</Label>
                    <Switch
                      id="ai-suggestions"
                      checked={workspace.aiSuggestions}
                      onCheckedChange={(checked) => setWorkspace({...workspace, aiSuggestions: checked})}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Recent Projects</h3>
                <Button size="sm" className="tech-gradient">
                  <Code className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>
              <div className="space-y-3">
                {projects.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Code className="h-5 w-5 text-tech-blue" />
                      <div>
                        <h4 className="font-semibold text-foreground">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">{project.framework} • {project.lastModified}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={project.status === 'Active' ? 'default' : project.status === 'Completed' ? 'secondary' : 'outline'}>
                        {project.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <GitBranch className="h-5 w-5 mr-2 text-tech-blue" />
                  Version Control
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>GitHub Integration</Label>
                    <Badge variant="secondary">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>GitLab Integration</Label>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Bitbucket Integration</Label>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Cloud className="h-5 w-5 mr-2 text-tech-purple" />
                  Cloud Services
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>AWS Integration</Label>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Google Cloud</Label>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Azure Integration</Label>
                    <Badge variant="outline">Available</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-bulb-glow" />
                  Databases
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>MongoDB Atlas</Label>
                    <Badge variant="secondary">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>PostgreSQL</Label>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Firebase</Label>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>API Rate Limiting</Label>
                    <Select defaultValue="standard">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative (100/min)</SelectItem>
                        <SelectItem value="standard">Standard (500/min)</SelectItem>
                        <SelectItem value="aggressive">Aggressive (1000/min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Memory Allocation</Label>
                    <Select defaultValue="4gb">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2gb">2GB</SelectItem>
                        <SelectItem value="4gb">4GB</SelectItem>
                        <SelectItem value="8gb">8GB</SelectItem>
                        <SelectItem value="16gb">16GB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Debug Mode</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Experimental Features</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Performance Analytics</Label>
                    <Switch defaultChecked />
                  </div>
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
            Save Workspace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
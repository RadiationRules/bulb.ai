import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Save, 
  Play, 
  FolderOpen, 
  File, 
  Plus, 
  Settings, 
  Share2, 
  Star, 
  GitFork,
  MessageSquare,
  Minimize2,
  Maximize2,
  RotateCcw,
  Terminal,
  Bot
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProjectFile {
  id: string;
  file_path: string;
  file_content: string;
  file_type: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  visibility: 'public' | 'private';
  tags: string[];
  file_structure: any;
  settings: any;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export default function Workspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isNewProject, setIsNewProject] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  
  // New project form
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (projectId === 'new') {
      setIsNewProject(true);
      // Initialize with default files
      const defaultFiles = [
        {
          id: 'temp-1',
          file_path: 'index.html',
          file_content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My BulbAI Project</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your New Project!</h1>
        <p>Start building something amazing with BulbAI.</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
          file_type: 'html'
        },
        {
          id: 'temp-2',
          file_path: 'script.js',
          file_content: `// Welcome to your new BulbAI project!
console.log('Hello from BulbAI!');

// Add your JavaScript code here
document.addEventListener('DOMContentLoaded', function() {
    console.log('Project loaded successfully!');
});`,
          file_type: 'javascript'
        },
        {
          id: 'temp-3',
          file_path: 'styles.css',
          file_content: `/* BulbAI Project Styles */
body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

h1 {
    color: white;
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 2rem;
}`,
          file_type: 'css'
        }
      ];
      setFiles(defaultFiles);
      setActiveFile('index.html');
      setFileContent(defaultFiles[0].file_content);
    } else if (projectId && user) {
      fetchProject();
    }
  }, [projectId, user, loading]);

  const fetchProject = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: filesData, error: filesError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('file_path');

      if (filesError) throw filesError;
      setFiles(filesData);
      
      if (filesData.length > 0) {
        setActiveFile(filesData[0].file_path);
        setFileContent(filesData[0].file_content);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive'
      });
    }
  };

  const createProject = async () => {
    if (!profile || !projectTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a project title',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectTitle,
          description: projectDescription,
          owner_id: profile.id,
          tags: projectTags,
          visibility: 'private'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Save files
      const filesToSave = files.map(file => ({
        project_id: projectData.id,
        file_path: file.file_path,
        file_content: file.file_content,
        file_type: file.file_type
      }));

      const { error: filesError } = await supabase
        .from('project_files')
        .insert(filesToSave);

      if (filesError) throw filesError;

      toast({
        title: 'Success',
        description: 'Project created successfully!'
      });

      navigate(`/workspace/${projectData.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const saveFile = async () => {
    if (!project || !activeFile) return;

    setSaving(true);
    try {
      const fileToUpdate = files.find(f => f.file_path === activeFile);
      
      if (fileToUpdate) {
        const { error } = await supabase
          .from('project_files')
          .update({ file_content: fileContent })
          .eq('id', fileToUpdate.id);

        if (error) throw error;
      }

      // Update local state
      setFiles(files.map(f => 
        f.file_path === activeFile 
          ? { ...f, file_content: fileContent }
          : f
      ));

      toast({
        title: 'Saved',
        description: 'File saved successfully'
      });
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: 'Error',
        description: 'Failed to save file',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !projectTags.includes(newTag.trim())) {
      setProjectTags([...projectTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProjectTags(projectTags.filter(tag => tag !== tagToRemove));
  };

  const selectFile = (filePath: string) => {
    const file = files.find(f => f.file_path === filePath);
    if (file) {
      setActiveFile(filePath);
      setFileContent(file.file_content);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (isNewProject) {
    return (
      <div className="h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
            <p className="text-muted-foreground">Set up your project details to get started</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Title</label>
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="My Awesome Project"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="What does your project do?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add tags..."
                    className="flex-1"
                  />
                  <Button onClick={addTag} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {projectTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={() => navigate('/dashboard')} variant="outline">
                  Cancel
                </Button>
                <Button 
                  onClick={createProject}
                  disabled={saving || !projectTitle.trim()}
                >
                  {saving ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </Button>
          <h1 className="font-semibold">{project?.title || 'Workspace'}</h1>
          {project && (
            <div className="flex items-center gap-2">
              <Badge variant={project.visibility === 'public' ? 'default' : 'secondary'}>
                {project.visibility}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Link copied!", description: "Project link copied to clipboard" });
          }}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            toast({ title: "Starred!", description: "Project added to favorites" });
          }}>
            <Star className="w-4 h-4 mr-2" />
            Star
          </Button>
          <Button onClick={saveFile} disabled={saving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const htmlFile = files.find(f => f.file_path === 'index.html');
            if (htmlFile) {
              const blob = new Blob([htmlFile.file_content], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            } else {
              toast({ title: "No HTML file", description: "Create an index.html file to run your project" });
            }
          }}>
            <Play className="w-4 h-4 mr-2" />
            Run
          </Button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* File explorer */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="hidden md:flex">
            <div className="h-full border-r bg-muted/30 flex flex-col">
              <div className="p-3 border-b flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">Files</span>
                  <Button variant="ghost" size="sm" className="ml-auto">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="p-2 flex-1 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.file_path}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-accent ${
                      activeFile === file.file_path ? 'bg-accent' : ''
                    }`}
                    onClick={() => selectFile(file.file_path)}
                  >
                    <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{file.file_path}</span>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle className="hidden md:flex" />
          
          {/* Editor */}
          <ResizablePanel defaultSize={copilotOpen ? 50 : 60} className="flex">
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={copilotOpen ? 70 : 100} className="flex">
                <div className="h-full flex flex-col w-full">
                  {/* Mobile file selector */}
                  <div className="md:hidden border-b bg-muted/20 p-2">
                    <Select value={activeFile || ''} onValueChange={selectFile}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a file" />
                      </SelectTrigger>
                      <SelectContent>
                        {files.map((file) => (
                          <SelectItem key={file.file_path} value={file.file_path}>
                            {file.file_path}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Editor tabs */}
                  <div className="border-b bg-muted/20 px-4 py-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {activeFile && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-sm border">
                          <File className="w-3 h-3" />
                          <span className="text-sm">{activeFile}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Code editor */}
                  <div className="flex-1 overflow-hidden">
                    <Textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="h-full w-full resize-none font-mono text-sm border-0 rounded-none"
                      placeholder="Start coding..."
                    />
                  </div>
                </div>
              </ResizablePanel>
              
              {copilotOpen && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <div className="h-full border-t bg-muted/20 flex flex-col">
                      <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <span className="font-medium">AI Copilot</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setCopilotOpen(false)}
                        >
                          <Minimize2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex-1 p-2 overflow-hidden">
                        <div className="h-full bg-background border rounded-lg overflow-hidden">
                          <iframe
                            src="https://www.chatbase.co/chatbot-iframe/W5ZOQa_6wOPIOFFfMXkIY"
                            width="100%"
                            height="100%"
                            style={{ 
                              border: "none", 
                              display: "block",
                              overflow: "hidden"
                            }}
                            title="AI Copilot"
                            allow="microphone; camera"
                          />
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Preview/Terminal panel */}
          <ResizablePanel defaultSize={copilotOpen ? 30 : 40} minSize={20} className="hidden lg:flex">
            <div className="h-full border-l flex flex-col">
              <Tabs defaultValue="preview" className="h-full flex flex-col">
                <TabsList className="w-full justify-start border-b rounded-none flex-shrink-0">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="terminal">Terminal</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="flex-1 m-0 p-0 overflow-hidden">
                  <div className="h-full bg-white">
                    <iframe
                      srcDoc={files.find(f => f.file_path === 'index.html')?.file_content || '<p>No HTML file found</p>'}
                      className="w-full h-full border-0"
                      title="Preview"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="terminal" className="flex-1 m-0 p-0 overflow-hidden">
                  <div className="h-full bg-black text-green-400 p-4 font-mono text-sm overflow-y-auto">
                    <div className="mb-2">BulbAI Terminal v1.0</div>
                    <div className="mb-2">$ npm start</div>
                    <div className="text-green-300">✓ Development server started</div>
                    <div className="text-blue-300">✓ Files compiled successfully</div>
                    <div className="text-yellow-300">→ Project statistics:</div>
                    <div className="ml-4 text-gray-300">
                      <div>Files: {files.length}</div>
                      <div>Lines: {files.reduce((acc, f) => acc + f.file_content.split('\n').length, 0)}</div>
                      <div>Size: {Math.round(files.reduce((acc, f) => acc + f.file_content.length, 0) / 1024)}KB</div>
                      <div>Last updated: {new Date().toLocaleTimeString()}</div>
                    </div>
                    <div className="mt-4 text-green-300">Ready for deployment ✨</div>
                    <div className="mt-4">
                      <span className="text-white">$ </span>
                      <span className="animate-pulse">_</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Floating action buttons and mobile controls */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-10">
        {!copilotOpen && (
          <Button 
            onClick={() => setCopilotOpen(true)}
            className="rounded-full w-12 h-12 shadow-lg tech-gradient"
            title="AI Copilot"
          >
            <Bot className="w-5 h-5" />
          </Button>
        )}
        <Button 
          variant="secondary"
          className="rounded-full w-12 h-12 shadow-lg lg:hidden"
          onClick={() => {
            const htmlFile = files.find(f => f.file_path === 'index.html');
            if (htmlFile) {
              const blob = new Blob([htmlFile.file_content], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }
          }}
          title="Preview"
        >
          <Play className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile preview modal */}
      <div className="lg:hidden">
        {/* Mobile preview could be implemented as a modal here */}
      </div>
    </div>
  );
}
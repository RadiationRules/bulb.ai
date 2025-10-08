import { useState, useEffect, useRef } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
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
  Bot,
  Send,
  Loader2,
  X
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

// Large Copilot Component for right side
const CopilotPanel = ({ 
  activeFile, 
  fileContent, 
  files,
  onUpdateFile,
  onCreateFile,
  onDeleteFile 
}: { 
  activeFile: string | null;
  fileContent: string;
  files: ProjectFile[];
  onUpdateFile: (content: string) => void;
  onCreateFile: (path: string, content: string, type: string) => void;
  onDeleteFile: (path: string) => void;
}) => {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, clearMessages, stopGeneration } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const processedMessagesRef = useRef<Set<number>>(new Set());
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [completedOperations, setCompletedOperations] = useState<string[]>([]);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-apply AI responses in real-time
  useEffect(() => {
    messages.forEach((message, index) => {
      if (message.role === 'assistant' && !processedMessagesRef.current.has(index)) {
        // Only process complete messages (not streaming in progress)
        if (!isLoading || index < messages.length - 1) {
          console.log(`🤖 Processing message ${index}:`, message.content.substring(0, 100));
          processedMessagesRef.current.add(index);
          parseAndApplyAIResponse(message.content);
        }
      }
    });
  }, [messages, isLoading]);

  // Show completion summary when AI finishes
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && completedOperations.length > 0) {
      const summary = completedOperations.join(', ');
      toast({
        title: '✓ AI finished',
        description: summary,
        duration: 4000,
      });
      setCompletedOperations([]);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, completedOperations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    // Build context for AI but don't show it to user
    const userMessage = input;
    let contextMessage = input;
    if (activeFile) {
      contextMessage = `Context: Currently editing "${activeFile}"

Available files: ${files.map(f => f.file_path).join(', ')}

Current file content:
\`\`\`
${fileContent.slice(0, 1000)}${fileContent.length > 1000 ? '...' : ''}
\`\`\`

User request: ${input}

RESPOND FORMAT:
1. Code edit: "[1 sentence what you're doing]\n\`\`\`language\n[complete code]\n\`\`\`"
2. New file: "CREATE_FILE: filename.ext\n\`\`\`language\n[complete code]\n\`\`\`"
3. Delete: "DELETE_FILE: filename.ext"

BE BRIEF. Code is AUTO-APPLIED immediately.`;
    }
    
    setInput('');
    
    try {
      // Send context to AI but store user message for display
      await sendMessage(contextMessage, userMessage);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const parseAndApplyAIResponse = (response: string) => {
    console.log('🔍 Parsing AI response:', response.substring(0, 200));
    
    // Auto-create files
    if (response.includes('CREATE_FILE:')) {
      const match = response.match(/CREATE_FILE:\s*(\S+)/);
      if (match) {
        const filename = match[1];
        console.log('📝 Creating file:', filename);
        setCurrentOperation(`Creating ${filename}...`);
        setCompletedOperations(prev => [...prev, `Created ${filename}`]);
        const extension = filename.split('.').pop() || 'txt';
        const contentMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
        const content = contentMatch ? contentMatch[1].trim() : '// New file\n';
        console.log('✅ File content length:', content.length);
        onCreateFile(filename, content, extension);
        setTimeout(() => setCurrentOperation(null), 1000);
        return;
      }
    }
    
    // Auto-delete files
    if (response.includes('DELETE_FILE:')) {
      const match = response.match(/DELETE_FILE:\s*(\S+)/);
      if (match) {
        console.log('🗑️ Deleting file:', match[1]);
        setCurrentOperation(`Deleting ${match[1]}...`);
        setCompletedOperations(prev => [...prev, `Deleted ${match[1]}`]);
        onDeleteFile(match[1]);
        setTimeout(() => setCurrentOperation(null), 1000);
        return;
      }
    }
    
    // Auto-apply code changes to active file
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeMatch && activeFile && !response.includes('CREATE_FILE:')) {
      const newContent = codeMatch[1].trim();
      console.log('✏️ Applying code to:', activeFile, 'Length:', newContent.length);
      setCurrentOperation(`Editing ${activeFile}...`);
      setCompletedOperations(prev => [...prev, `Updated ${activeFile}`]);
      onUpdateFile(newContent);
      setTimeout(() => setCurrentOperation(null), 1000);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
                AI Copilot
              </h2>
              <p className="text-xs text-muted-foreground">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearMessages}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
        
        {activeFile && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
            <File className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium truncate">{activeFile}</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {files.length} files
            </Badge>
          </div>
        )}
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">AI Copilot Ready</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                I can help you write code, create files, fix bugs, and more.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                <Card className="p-4 hover:shadow-lg transition-shadow">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    Code Assistance
                  </h4>
                  <p className="text-sm text-muted-foreground">Write, review, and fix code</p>
                </Card>
                <Card className="p-4 hover:shadow-lg transition-shadow">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <File className="w-4 h-4 text-primary" />
                    File Management
                  </h4>
                  <p className="text-sm text-muted-foreground">Create and delete files</p>
                </Card>
                <Card className="p-4 hover:shadow-lg transition-shadow">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Optimization
                  </h4>
                  <p className="text-sm text-muted-foreground">Improve performance</p>
                </Card>
                <Card className="p-4 hover:shadow-lg transition-shadow">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Explanations
                  </h4>
                  <p className="text-sm text-muted-foreground">Understand your code</p>
                </Card>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => {
            // Extract operation info from assistant messages
            let displayContent = message.content;
            let operationBadge = null;
            
            if (message.role === "assistant") {
              // Extract and show file operations
              if (message.content.includes('CREATE_FILE:')) {
                const match = message.content.match(/CREATE_FILE:\s*(\S+)/);
                if (match) {
                  operationBadge = <Badge className="mb-2 bg-green-500 text-white animate-scale-in">✓ Created {match[1]}</Badge>;
                  displayContent = displayContent.replace(/CREATE_FILE:\s*\S+/, '').trim();
                }
              }
              if (message.content.includes('DELETE_FILE:')) {
                const match = message.content.match(/DELETE_FILE:\s*(\S+)/);
                if (match) {
                  operationBadge = <Badge className="mb-2 bg-red-500 text-white animate-scale-in">✓ Deleted {match[1]}</Badge>;
                  displayContent = displayContent.replace(/DELETE_FILE:\s*\S+/, '').trim();
                }
              }
              // Clean up code blocks - only show description
              if (displayContent.includes('```')) {
                const beforeCode = displayContent.split('```')[0].trim();
                if (!operationBadge) {
                  operationBadge = <Badge className="mb-2 bg-blue-500 text-white animate-scale-in">✓ Updated {activeFile}</Badge>;
                }
                displayContent = beforeCode || "✓ Changes applied successfully";
              }
            }
            
            return (
              <div
                key={index}
                className={cn(
                  "flex gap-4 animate-fade-in-up",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center flex-shrink-0 animate-scale-in">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 max-w-[85%]">
                  {operationBadge}
                  <div
                    className={cn(
                      "rounded-2xl px-5 py-3 shadow-sm transition-all duration-300",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-card border"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{displayContent}</p>
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 animate-scale-in">
                    <span className="text-primary-foreground font-semibold text-sm">You</span>
                  </div>
                )}
              </div>
            );
          })}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-4 animate-fade-in-up">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center flex-shrink-0 animate-scale-in">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-2">
                {currentOperation && (
                  <Badge className="bg-blue-500 animate-pulse text-white">
                    ⚡ {currentOperation}
                  </Badge>
                )}
                <div className="rounded-2xl px-5 py-3 bg-card border shadow-sm flex items-center gap-3 transition-all duration-300">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {currentOperation ? 'Applying changes...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI to write code, create files, or help with your project..."
              disabled={isLoading}
              className="flex-1 h-12 text-sm px-4 rounded-xl shadow-sm"
            />
            {isLoading ? (
              <Button 
                type="button" 
                onClick={stopGeneration} 
                variant="destructive" 
                size="lg"
                className="h-12 px-6 rounded-xl"
              >
                <X className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={!input.trim()} 
                size="lg"
                className="h-12 px-6 rounded-xl shadow-sm"
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Tip: Describe what you want to build or fix, and I'll help you code it
          </p>
        </form>
      </div>
    </div>
  );
};

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
  
  // New project form
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (loading) return;
    
    if (!user) {
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

  const handleCopilotUpdateFile = async (content: string) => {
    setFileContent(content);
    
    // Auto-save after update
    if (project && activeFile) {
      try {
        const fileToUpdate = files.find(f => f.file_path === activeFile);
        
        if (fileToUpdate) {
          const { error } = await supabase
            .from('project_files')
            .update({ file_content: content })
            .eq('id', fileToUpdate.id);

          if (error) throw error;
          
          // Update local state
          setFiles(files.map(f => 
            f.file_path === activeFile 
              ? { ...f, file_content: content }
              : f
          ));
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }
  };

  const handleCopilotCreateFile = async (path: string, content: string, type: string) => {
    if (!project) {
      // For new projects
      const newFile: ProjectFile = {
        id: `temp-${Date.now()}`,
        file_path: path,
        file_content: content,
        file_type: type
      };
      setFiles([...files, newFile]);
      setActiveFile(path);
      setFileContent(content);
      toast({
        title: "File created",
        description: `${path} has been created`,
      });
    } else {
      // For existing projects
      try {
        const { data, error } = await supabase
          .from('project_files')
          .insert({
            project_id: project.id,
            file_path: path,
            file_content: content,
            file_type: type
          })
          .select()
          .single();

        if (error) throw error;

        setFiles([...files, data]);
        setActiveFile(path);
        setFileContent(content);
        toast({
          title: "File created",
          description: `${path} has been created`,
        });
      } catch (error) {
        console.error('Error creating file:', error);
        toast({
          title: "Error",
          description: "Failed to create file",
          variant: "destructive"
        });
      }
    }
  };

  const handleCopilotDeleteFile = async (path: string) => {
    if (!project) {
      setFiles(files.filter(f => f.file_path !== path));
      if (activeFile === path) {
        const remaining = files.filter(f => f.file_path !== path);
        if (remaining.length > 0) {
          selectFile(remaining[0].file_path);
        } else {
          setActiveFile(null);
          setFileContent('');
        }
      }
      toast({
        title: "File deleted",
        description: `${path} has been removed`,
      });
    } else {
      try {
        const fileToDelete = files.find(f => f.file_path === path);
        if (!fileToDelete) return;

        await supabase
          .from('project_files')
          .delete()
          .eq('id', fileToDelete.id);

        setFiles(files.filter(f => f.file_path !== path));
        if (activeFile === path) {
          const remaining = files.filter(f => f.file_path !== path);
          if (remaining.length > 0) {
            selectFile(remaining[0].file_path);
          } else {
            setActiveFile(null);
            setFileContent('');
          }
        }
        toast({
          title: "File deleted",
          description: `${path} has been removed`,
        });
      } catch (error) {
        console.error('Error deleting file:', error);
        toast({
          title: "Error",
          description: "Failed to delete file",
          variant: "destructive"
        });
      }
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
          <ResizablePanel defaultSize={40} className="flex">
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
          
          <ResizableHandle />
          
          {/* AI Copilot Panel */}
          <ResizablePanel defaultSize={40} minSize={30} className="hidden lg:flex">
            <div className="h-full border-l">
              <CopilotPanel 
                activeFile={activeFile}
                fileContent={fileContent}
                files={files}
                onUpdateFile={handleCopilotUpdateFile}
                onCreateFile={handleCopilotCreateFile}
                onDeleteFile={handleCopilotDeleteFile}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile preview button */}
      <div className="fixed bottom-6 right-6 z-10 lg:hidden">
        <Button 
          variant="secondary"
          className="rounded-full w-12 h-12 shadow-lg"
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
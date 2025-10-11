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
  X,
  Code,
  Monitor,
  RefreshCw
} from 'lucide-react';
import { FileTree } from '@/components/FileTree';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

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
  onDeleteFile,
  codingFile,
  onCodingFile
}: { 
  activeFile: string | null;
  fileContent: string;
  files: ProjectFile[];
  onUpdateFile: (content: string) => void;
  onCreateFile: (path: string, content: string, type: string) => void;
  onDeleteFile: (path: string) => void;
  codingFile: string | null;
  onCodingFile: (file: string | null) => void;
}) => {
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage, clearMessages, stopGeneration } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const processedMessagesRef = useRef<Set<number>>(new Set());
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);

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
        setCurrentOperation(`Creating ${filename}`);
        onCodingFile(filename);
        
        const extension = filename.split('.').pop() || 'txt';
        const contentMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
        const content = contentMatch ? contentMatch[1].trim() : '// New file\n';
        console.log('✅ File content length:', content.length);
        
        onCreateFile(filename, content, extension);
        
        toast({
          title: '✨ File Created',
          description: filename,
          duration: 2000,
        });
        
        setCurrentOperation(null);
        onCodingFile(null);
        return;
      }
    }
    
    // Auto-delete files - support multiple files
    if (response.includes('DELETE_FILE:')) {
      const matches = response.matchAll(/DELETE_FILE:\s*(\S+)/g);
      const filenames = Array.from(matches).map(m => m[1]);
      if (filenames.length > 0) {
        console.log('🗑️ Deleting files:', filenames);
        setCurrentOperation(`Deleting ${filenames.length} file(s)`);
        
        filenames.forEach(filename => onDeleteFile(filename));
        
        toast({
          title: '🗑️ Files Deleted',
          description: `${filenames.length} file(s) removed`,
          duration: 2000,
        });
        
        setCurrentOperation(null);
        return;
      }
    }
    
    // Auto-apply code changes to active file
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeMatch && activeFile && !response.includes('CREATE_FILE:')) {
      const newContent = codeMatch[1].trim();
      console.log('✏️ Applying code to:', activeFile, 'Length:', newContent.length);
      setCurrentOperation(`Updating ${activeFile}`);
      onCodingFile(activeFile);
      
      onUpdateFile(newContent);
      
      toast({
        title: '✓ Code Applied',
        description: activeFile,
        duration: 2000,
      });
      
      setCurrentOperation(null);
      onCodingFile(null);
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
              // Extract and show file operations with enhanced animations
              if (message.content.includes('CREATE_FILE:')) {
                const match = message.content.match(/CREATE_FILE:\s*(\S+)/);
                if (match) {
                  operationBadge = (
                    <Badge className="mb-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white animate-fade-in shadow-lg border-0">
                      <span className="animate-scale-in inline-block">✨</span> Created {match[1]}
                    </Badge>
                  );
                  displayContent = displayContent.replace(/CREATE_FILE:\s*\S+/, '').trim();
                }
              }
              if (message.content.includes('DELETE_FILE:')) {
                const match = message.content.match(/DELETE_FILE:\s*(\S+)/);
                if (match) {
                  operationBadge = (
                    <Badge className="mb-2 bg-gradient-to-r from-red-500 to-rose-600 text-white animate-fade-in shadow-lg border-0">
                      <span className="animate-scale-in inline-block">🗑️</span> Deleted {match[1]}
                    </Badge>
                  );
                  displayContent = displayContent.replace(/DELETE_FILE:\s*\S+/, '').trim();
                }
              }
              // Clean up code blocks - show description with code indicator
              if (displayContent.includes('```')) {
                const beforeCode = displayContent.split('```')[0].trim();
                const codeBlocks = displayContent.match(/```[\s\S]*?```/g);
                const hasCode = codeBlocks && codeBlocks.length > 0;
                
                if (!operationBadge && hasCode) {
                  operationBadge = (
                    <Badge className="mb-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white animate-fade-in shadow-lg border-0">
                      <Code className="w-3 h-3 mr-1 inline" />
                      <span className="inline-flex items-center gap-1">
                        <span className="animate-pulse">⚡</span>
                        Coding {codingFile || activeFile}
                      </span>
                    </Badge>
                  );
                }
                
                // Show description + code indicator
                if (beforeCode) {
                  displayContent = beforeCode;
                  if (hasCode) {
                    displayContent += "\n\n✨ Code generated and applied seamlessly";
                  }
                } else {
                  displayContent = "✓ Changes applied successfully";
                }
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue via-blue-500 to-bulb-glow flex items-center justify-center flex-shrink-0 animate-scale-in shadow-lg hover:shadow-xl transition-shadow">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 max-w-[85%]">
                  {operationBadge}
                  <div
                    className={cn(
                      "rounded-2xl px-5 py-3 shadow-md transition-all duration-300 hover:shadow-lg",
                      message.role === "user"
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ml-auto animate-slide-in-right"
                        : "bg-gradient-to-br from-card to-card/80 border border-primary/10 backdrop-blur-sm animate-fade-in"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{displayContent}</p>
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 animate-scale-in shadow-lg">
                    <span className="text-primary-foreground font-semibold text-sm">You</span>
                  </div>
                )}
              </div>
            );
          })}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="rounded-2xl px-5 py-3 bg-gradient-to-br from-card to-card/80 border border-primary/10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {codingFile ? `Coding ${codingFile}...` : currentOperation || 'Thinking...'}
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
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [codingFile, setCodingFile] = useState<string | null>(null);

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

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive"
      });
      return;
    }
    
    // If a folder is selected, create file inside it
    const fileName = selectedFolder && !newFileName.includes('/') 
      ? `${selectedFolder}/${newFileName}` 
      : newFileName;
    
    const extension = fileName.split('.').pop() || 'txt';
    handleCopilotCreateFile(fileName, '// New file\n', extension);
    setNewFileName('');
    setShowNewFileDialog(false);
  };

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name",
        variant: "destructive"
      });
      return;
    }
    
    // Create a .gitkeep file in the folder
    handleCopilotCreateFile(`${newFolderName}/.gitkeep`, '', 'txt');
    setNewFolderName('');
    setShowNewFolderDialog(false);
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const htmlFile = files.find(f => f.file_path === 'index.html');
              if (htmlFile) {
                // Create a complete HTML document with proper asset handling
                const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project?.title || 'Preview'}</title>
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${htmlFile.file_content.replace(/<\/?(?:html|head|body)[^>]*>/gi, '')}
  <script>
    // Inject CSS files
    ${files.filter(f => f.file_path.endsWith('.css')).map(f => 
      `const style${files.indexOf(f)} = document.createElement('style');
       style${files.indexOf(f)}.textContent = \`${f.file_content.replace(/`/g, '\\`')}\`;
       document.head.appendChild(style${files.indexOf(f)});`
    ).join('\n')}
    
    // Inject JS files
    ${files.filter(f => f.file_path.endsWith('.js')).map(f => 
      `try { ${f.file_content} } catch(e) { console.error('Error in ${f.file_path}:', e); }`
    ).join('\n')}
  </script>
</body>
</html>`;
                
                const blob = new Blob([fullHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                toast({ 
                  title: "🚀 Site Deployed!", 
                  description: "Your project opened in a new tab" 
                });
              } else {
                toast({ 
                  title: "No HTML file", 
                  description: "Create an index.html file to preview your project", 
                  variant: "destructive" 
                });
              }
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Deploy Live
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
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">Files</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => setShowNewFileDialog(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    New
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => setShowNewFolderDialog(true)}
                  >
                    <FolderOpen className="w-3 h-3 mr-1" />
                    Folder
                  </Button>
                </div>
              </div>
              <div className="p-2 flex-1 overflow-y-auto">
                <FileTree
                  files={files}
                  activeFile={activeFile}
                  onSelectFile={selectFile}
                  onCreateFile={(path) => {
                    const extension = path.split('.').pop() || 'txt';
                    handleCopilotCreateFile(path, '// New file\n', extension);
                  }}
                  onDeleteFiles={(paths) => {
                    paths.forEach(path => handleCopilotDeleteFile(path));
                  }}
                  onRenameFile={(oldPath, newPath) => {
                    // Implementation for renaming
                    const file = files.find(f => f.file_path === oldPath);
                    if (file && project) {
                      supabase
                        .from('project_files')
                        .update({ file_path: newPath })
                        .eq('id', file.id)
                        .then(() => {
                          fetchProject();
                          toast({ title: 'File renamed', description: `${oldPath} → ${newPath}` });
                        });
                    }
                  }}
                  onMoveFile={(path, newFolder) => {
                    // Implementation for moving files
                    console.log('Move', path, 'to', newFolder);
                  }}
                  selectedFolder={selectedFolder}
                  onSelectFolder={setSelectedFolder}
                />
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
            <CopilotPanel 
              activeFile={activeFile}
              fileContent={fileContent}
              files={files}
              onUpdateFile={handleCopilotUpdateFile}
              onCreateFile={handleCopilotCreateFile}
              onDeleteFile={handleCopilotDeleteFile}
              codingFile={codingFile}
              onCodingFile={setCodingFile}
            />
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

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>Enter a name for your new file (e.g., index.html, script.js)</DialogDescription>
          </DialogHeader>
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.ext"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewFile}>
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter a name for your new folder</DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="folder-name"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewFolder}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
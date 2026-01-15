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
import Editor from '@monaco-editor/react';
import { FileSearch } from '@/components/FileSearch';
import { LoadingScreen } from '@/components/LoadingSpinner';
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
  Terminal as TerminalIcon,
  Bot,
  Send,
  Loader2,
  X,
  Code,
  Monitor,
  RefreshCw,
  Undo2,
  Redo2,
  Search,
  Download,
  Upload,
  Users,
  UserPlus,
  GitBranch,
  Package,
  Rocket,
  Sparkles,
  FileText
} from 'lucide-react';
import { GitPanel } from '@/components/GitPanel';
import { CollaborationPanel } from '@/components/CollaborationPanel';
import { FriendsPanel } from '@/components/FriendsPanel';
import { CommunityShowcase } from '@/components/CommunityShowcase';
import { DeploymentPanel } from '@/components/DeploymentPanel';
import { ActivityFeed } from '@/components/ActivityFeed';
import { Terminal } from '@/components/Terminal';
import { EnvironmentVariables } from '@/components/EnvironmentVariables';
import { PackageManager } from '@/components/PackageManager';
import { FileTree } from '@/components/FileTree';
import { useToast } from '@/components/ui/use-toast';
import { useCollaboration } from '@/hooks/useCollaboration';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { NotificationCenter } from '@/components/NotificationCenter';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import { CommandPalette } from '@/components/CommandPalette';
import { useKeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { CodeReviewPanel } from '@/components/CodeReviewPanel';
import { QualityDashboard } from '@/components/QualityDashboard';
import { DocumentationPanel } from '@/components/DocumentationPanel';
import { CodePlayground } from '@/components/CodePlayground';
import { ProfileModal } from '@/components/ProfileModal';
import { VoiceInput } from '@/components/VoiceInput';
import { LiveCodeOverlay } from '@/components/LiveCodeOverlay';
import { AICodingScreen } from '@/components/AICodingScreen';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ProjectPreview } from '@/components/ProjectPreview';
import { ShareDialog } from '@/components/ShareDialog';
import { ImageIcon } from 'lucide-react';

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
          <div className="flex gap-2">
            <VoiceInput 
              onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
              disabled={isLoading}
            />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI to write code, create files, or speak..."
              disabled={isLoading}
              className="flex-1 h-10 text-sm px-4 rounded-lg"
            />
            {isLoading ? (
              <Button type="button" onClick={stopGeneration} variant="destructive" className="h-10 px-4 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()} className="h-10 px-4 rounded-lg">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function to get Monaco language from file extension
const getLanguageFromFile = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sql': 'sql',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
  };
  return languageMap[ext || ''] || 'plaintext';
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
  const [showAICodingScreen, setShowAICodingScreen] = useState(false);
  const [history, setHistory] = useState<{content: string, file: string}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<'copilot' | 'collab' | 'activity' | 'friends' | 'community' | 'dev' | 'deploy' | 'review' | 'quality' | 'docs' | 'playground' | 'preview'>('copilot');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [copilotImages, setCopilotImages] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [lintIssues, setLintIssues] = useState([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 });
  const [aiPrompt, setAiPrompt] = useState('');

  // Collaboration
  const { collaborators, setEditor } = useCollaboration(
    projectId || '',
    profile?.id || '',
    activeFile
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile && !isNewProject) {
          saveFile();
        }
      }
      // Ctrl+P or Cmd+P for file search
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowFileSearch(true);
      }
      // Ctrl+K or Cmd+K for command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, fileContent, isNewProject]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!project || !activeFile || isNewProject) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for 2 seconds
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      
      try {
        const fileToUpdate = files.find(f => f.file_path === activeFile);
        if (fileToUpdate) {
          const { error } = await supabase
            .from('project_files')
            .update({ file_content: fileContent })
            .eq('id', fileToUpdate.id);

          if (!error) {
            setFiles(files.map(f => 
              f.file_path === activeFile 
                ? { ...f, file_content: fileContent }
                : f
            ));
            setAutoSaveStatus('saved');
            
            // Reset to idle after 2 seconds
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
          }
        }
      } catch (error) {
        console.error('Auto-save error:', error);
        setAutoSaveStatus('idle');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [fileContent, activeFile, project, isNewProject]);

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (loading) {
      setPageLoading(true);
      return;
    }
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (projectId === 'new') {
      setIsNewProject(true);
      setPageLoading(false);
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
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { 
            max-width: 600px;
            background: white;
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { 
            color: #2563eb;
            margin: 0 0 1rem 0;
        }
        p {
            color: #64748b;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>✨ Welcome to BulbAI</h1>
        <p>Start building something amazing! This is your blank canvas.</p>
        <p>Edit this HTML or ask the AI to help you create something wonderful.</p>
    </div>
</body>
</html>`,
          file_type: 'html'
        },
        {
          id: 'temp-2',
          file_path: 'README.md',
          file_content: `# My BulbAI Project

This is a new project created with BulbAI. 

## About

Describe your project here. This description will be visible to others when you share your project publicly.

## Getting Started

Start editing the files to build your project!`,
          file_type: 'markdown'
        }
      ];
      setFiles(defaultFiles);
      setActiveFile('index.html');
      setFileContent(defaultFiles[0].file_content);
    } else if (projectId && user) {
      fetchProject();
    }
  }, [projectId, user, loading]);

  // AI coding screen visibility (driven by Copilot file operations)
  useEffect(() => {
    if (codingFile) {
      setShowAICodingScreen(true);
      return;
    }

    const timeout = setTimeout(() => setShowAICodingScreen(false), 700);
    return () => clearTimeout(timeout);
  }, [codingFile]);

  // Drag and drop file upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    for (const file of droppedFiles) {
      const content = await file.text();
      const newFile = {
        id: `temp-${Date.now()}-${Math.random()}`,
        file_path: file.name,
        file_content: content,
        file_type: file.name.split('.').pop() || 'txt'
      };
      
      setFiles(prev => [...prev, newFile]);
      toast({
        title: 'File uploaded',
        description: `${file.name} added to project`,
        duration: 1500
      });
    }
  };

  // Download project as ZIP
  const downloadProject = () => {
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    files.forEach(file => {
      zip.file(file.file_path, file.file_content);
    });
    
    zip.generateAsync({ type: 'blob' }).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.title || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Project downloaded',
        description: 'ZIP file saved successfully',
        duration: 1500
      });
    });
  };

  const fetchProject = async () => {
    setPageLoading(true);
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
    } finally {
      setPageLoading(false);
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
      // Save to history
      setHistory(prev => [...prev.slice(0, historyIndex + 1), { content: file.file_content, file: filePath }]);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setFileContent(prevState.content);
      setActiveFile(prevState.file);
      setHistoryIndex(historyIndex - 1);
      toast({ title: "Undone", duration: 1500 });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setFileContent(nextState.content);
      setActiveFile(nextState.file);
      setHistoryIndex(historyIndex + 1);
      toast({ title: "Redone", duration: 1500 });
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
        duration: 1500
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
          duration: 1500
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
          variant: "destructive",
          duration: 1500
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

  if (pageLoading) {
    return <LoadingScreen message="Loading workspace..." />;
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
    <div 
      className="h-screen bg-background flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* AI Coding Screen Overlay */}
      <AICodingScreen
        isActive={showAICodingScreen && codingFile !== null}
        filename={codingFile || 'code'}
        code={fileContent}
        onClose={() => setShowAICodingScreen(false)}
      />

      {/* Real-time Presence Indicator */}
      {project && user && (
        <PresenceIndicator 
          projectId={project.id} 
          currentUserId={user.id} 
        />
      )}

      {/* Header */}
      <div className="border-b bg-card/50 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="hidden md:flex">
            ← Dashboard
          </Button>
          <h1 className="font-semibold text-sm md:text-base">{project?.title || 'Workspace'}</h1>
          {project && (
            <div className="flex items-center gap-2">
              <Badge variant={project.visibility === 'public' ? 'default' : 'secondary'}>
                {project.visibility}
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className={cn(
              historyIndex <= 0 && "opacity-40", 
              historyIndex > 0 && "glow-white",
              "hidden sm:flex"
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={cn(
              historyIndex >= history.length - 1 && "opacity-40", 
              historyIndex < history.length - 1 && "glow-white",
              "hidden sm:flex"
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          {autoSaveStatus !== 'idle' && (
            <span className={cn(
              "text-xs px-2 py-1 rounded-md ml-2 hidden sm:inline-flex items-center gap-1",
              autoSaveStatus === 'saving' && "text-muted-foreground",
              autoSaveStatus === 'saved' && "text-green-500"
            )}>
              {autoSaveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  ✓ Saved
                </>
              )}
            </span>
          )}
          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFileSearch(true)}
            title="Search files (Ctrl+P)"
            className="hidden sm:flex"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={downloadProject}
            title="Download project"
            className="hidden sm:flex"
          >
            <Download className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1 hidden md:block" />
          <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
            <Share2 className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">Share</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            toast({ title: "Starred!", description: "Added to favorites", duration: 1500 });
          }} className="hidden lg:flex">
            <Star className="w-4 h-4 mr-2" />
            Star
          </Button>
          <Button onClick={saveFile} disabled={saving} size="sm" title="Save (Ctrl+S)">
            <Save className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="hidden md:inline">{saving ? 'Saving...' : 'Save'}</span>
          </Button>
          <div className="w-px h-6 bg-border mx-2 hidden md:block" />
          {user && <NotificationCenter userId={user.id} />}
          {user && <UserProfileMenu userId={user.id} />}
          <Button 
            variant="default" 
            size="sm" 
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
            onClick={() => setRightPanelTab('deploy')}
          >
            <Rocket className="w-4 h-4 mr-2" />
            Deploy
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
                    <File className="w-3 h-3 mr-1" />
                    File
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
              
              {/* Code editor with Monaco */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language={getLanguageFromFile(activeFile || '')}
                  value={fileContent}
                  onChange={(value) => setFileContent(value || '')}
                  theme="vs-dark"
                  onMount={(editor) => {
                    editorRef.current = editor;
                    setEditor(editor);
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Right Panel - Sleek Tabs */}
          <ResizablePanel defaultSize={40} minSize={30} className="hidden lg:flex flex-col">
            <div className="flex-shrink-0 border-b bg-gradient-to-r from-card/50 to-muted/30">
              <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as any)}>
                <ScrollArea className="w-full">
                  <TabsList className="inline-flex h-11 items-center gap-1 rounded-none bg-transparent p-1">
                    <TabsTrigger value="copilot" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Bot className="w-3.5 h-3.5 mr-1.5" />
                      AI
                    </TabsTrigger>
                    <TabsTrigger value="collab" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      Live
                    </TabsTrigger>
                    <TabsTrigger value="dev" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <TerminalIcon className="w-3.5 h-3.5 mr-1.5" />
                      Dev
                    </TabsTrigger>
                    <TabsTrigger value="deploy" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Rocket className="w-3.5 h-3.5 mr-1.5" />
                      Deploy
                    </TabsTrigger>
                    <TabsTrigger value="review" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Review
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <GitBranch className="w-3.5 h-3.5" />
                    </TabsTrigger>
                    <TabsTrigger value="friends" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <UserPlus className="w-3.5 h-3.5" />
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Monitor className="w-3.5 h-3.5 mr-1.5" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </ScrollArea>
              </Tabs>
            </div>

            <div className="flex-1 overflow-hidden">
              {rightPanelTab === 'copilot' && (
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
              )}
              {rightPanelTab === 'collab' && project && (
                <CollaborationPanel
                  projectId={project.id}
                  currentUserId={profile?.id || ''}
                  activeFile={activeFile}
                />
              )}
              {rightPanelTab === 'activity' && profile && (
                <ActivityFeed userId={profile.id} />
              )}
              {rightPanelTab === 'friends' && user && (
                <FriendsPanel userId={user.id} />
              )}
              {rightPanelTab === 'community' && (
                <CommunityShowcase userId={user?.id} />
              )}
              {rightPanelTab === 'dev' && project && (
                <Tabs defaultValue="terminal" className="flex flex-col h-full">
                  <TabsList className="w-full justify-start rounded-none">
                    <TabsTrigger value="terminal">Terminal</TabsTrigger>
                    <TabsTrigger value="git">Git</TabsTrigger>
                    <TabsTrigger value="packages">Packages</TabsTrigger>
                    <TabsTrigger value="env">Environment</TabsTrigger>
                  </TabsList>
                  <TabsContent value="terminal" className="flex-1 overflow-hidden m-0">
                    <Terminal onClose={() => {}} />
                  </TabsContent>
                  <TabsContent value="git" className="flex-1 overflow-hidden m-0">
                    <GitPanel projectId={project.id} userId={profile?.id || ''} />
                  </TabsContent>
                  <TabsContent value="packages" className="flex-1 overflow-hidden m-0">
                    <PackageManager projectId={project.id} />
                  </TabsContent>
                  <TabsContent value="env" className="flex-1 overflow-hidden m-0">
                    <EnvironmentVariables projectId={project.id} />
                  </TabsContent>
                </Tabs>
              )}
              {rightPanelTab === 'deploy' && project && (
                <DeploymentPanel 
                  projectId={project.id} 
                  projectName={project.title}
                  visibility={project.visibility}
                  onVisibilityChange={(v) => setProject({ ...project, visibility: v })}
                />
              )}
              {rightPanelTab === 'review' && (
                <CodeReviewPanel 
                  fileName={activeFile || 'untitled'} 
                  fileContent={fileContent} 
                  language={getLanguageFromFile(activeFile || '')}
                />
              )}
              {rightPanelTab === 'quality' && project && (
                <QualityDashboard projectId={project.id} />
              )}
              {rightPanelTab === 'docs' && (
                <DocumentationPanel 
                  code={fileContent}
                  fileName={activeFile || 'untitled'}
                  language={getLanguageFromFile(activeFile || '')}
                />
              )}
              {rightPanelTab === 'playground' && (
                <CodePlayground 
                  initialCode={fileContent}
                  language={getLanguageFromFile(activeFile || '')}
                />
              )}
              {rightPanelTab === 'preview' && (
                <ProjectPreview
                  files={files.reduce((acc, f) => ({ ...acc, [f.file_path]: f.file_content }), {})}
                  projectName={project?.title || 'Preview'}
                />
              )}
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

      {/* File Search Modal */}
      <FileSearch
        open={showFileSearch}
        onOpenChange={setShowFileSearch}
        files={files.map(f => ({ path: f.file_path, type: 'file' as const }))}
        onSelectFile={(path) => {
          const file = files.find(f => f.file_path === path);
          if (file) {
            setActiveFile(path);
            setFileContent(file.file_content);
          }
        }}
      />

      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-primary">
          <div className="text-center">
            <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">Drop files to upload</h2>
            <p className="text-muted-foreground mt-2">Files will be added to your project</p>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal 
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        files={files}
        onSelectFile={(path) => {
          const file = files.find(f => f.file_path === path);
          if (file) {
            setActiveFile(path);
            setFileContent(file.file_content);
          }
        }}
        onOpenPanel={(panel) => {
          if (panel === 'git') setRightPanelTab('dev');
          else if (panel === 'deployment') setRightPanelTab('deploy');
          else if (panel === 'terminal') setRightPanelTab('dev');
          else if (panel === 'packages') setRightPanelTab('dev');
          else if (panel === 'collaboration') setRightPanelTab('collab');
          else if (panel === 'activity') setRightPanelTab('activity');
          else if (panel === 'review') setRightPanelTab('review');
        }}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        projectUrl={`https://bulbai.app/p/${project?.id || ''}`}
        projectName={project?.title || 'My Project'}
        isPublic={project?.visibility === 'public'}
      />
    </div>
  );
}
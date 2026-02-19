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
import JSZip from 'jszip';
import { 
  Save, Play, FolderOpen, File, Plus, Settings, Share2, Star, GitFork,
  MessageSquare, Minimize2, Maximize2, RotateCcw, Terminal as TerminalIcon,
  Bot, Send, Loader2, X, Code, Monitor, RefreshCw, Undo2, Redo2, Search,
  Download, Upload, Users, UserPlus, GitBranch, Package, Rocket, Sparkles, FileText, Clock
} from 'lucide-react';
import { GitPanel } from '@/components/GitPanel';
import { CollaborationPanel } from '@/components/CollaborationPanel';
import { FriendsPanel } from '@/components/FriendsPanel';
import { CommunityShowcase } from '@/components/CommunityShowcase';
import { DeploymentPanel } from '@/components/DeploymentPanel';
import { DeploymentOverlay } from '@/components/DeploymentOverlay';
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
import { HistoryPanel } from '@/components/HistoryPanel';
import { SuggestionChips } from '@/components/SuggestionChips';
import { AiActivityIndicator } from '@/components/AiActivityIndicator';
import { FileChangePanel } from '@/components/FileChangePanel';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { ProjectPreview } from '@/components/ProjectPreview';
import { ShareDialog } from '@/components/ShareDialog';

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

// AI Suggestion chips
const AI_SUGGESTIONS = [
  'Add a responsive navbar',
  'Create a login form',
  'Build a todo app',
  'Add dark mode toggle',
  'Create an API endpoint',
  'Add form validation',
];

// Copilot Panel
const CopilotPanel = ({ 
  activeFile, fileContent, files, onUpdateFile, onCreateFile, onDeleteFile, codingFile, onCodingFile, projectId, onSelectFile
}: { 
  activeFile: string | null;
  fileContent: string;
  files: ProjectFile[];
  onUpdateFile: (content: string) => void;
  onCreateFile: (path: string, content: string, type: string) => void;
  onDeleteFile: (path: string) => void;
  codingFile: string | null;
  onCodingFile: (file: string | null) => void;
  projectId?: string;
  onSelectFile: (path: string) => void;
}) => {
  const [input, setInput] = useState('');
  const { messages, isLoading, aiStage, stageDetail, sendMessage, clearMessages, stopGeneration } = useChat(projectId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const processedMessagesRef = useRef<Set<number>>(new Set());
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);
  const [fileChanges, setFileChanges] = useState<Map<string, { oldContent: string; newContent: string; type: 'create' | 'update' | 'delete' }>>(new Map());
  const [undoneFiles, setUndoneFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    messages.forEach((message, index) => {
      if (message.role === 'assistant' && !processedMessagesRef.current.has(index)) {
        if (!isLoading || index < messages.length - 1) {
          processedMessagesRef.current.add(index);
          parseAndApplyAIResponse(message.content);
        }
      }
    });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    let contextMessage = input;
    if (activeFile) {
      contextMessage = `Context: Editing "${activeFile}"\nFiles: ${files.map(f => f.file_path).join(', ')}\nCurrent:\n\`\`\`\n${fileContent.slice(0, 1000)}${fileContent.length > 1000 ? '...' : ''}\n\`\`\`\nRequest: ${input}\n\nRESPOND FORMAT:\n1. Code edit: "[1 sentence]\\n\`\`\`language\\n[code]\`\`\`"\n2. New file: "CREATE_FILE: filename.ext\\n\`\`\`language\\n[code]\`\`\`"\n3. Delete: "DELETE_FILE: filename.ext"\nBE BRIEF. Code AUTO-APPLIED.`;
    }
    
    setInput('');
    
    try {
      await sendMessage(contextMessage, userMessage);
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const parseAndApplyAIResponse = (response: string) => {
    const newChanges = new Map(fileChanges);
    
    // Handle multiple CREATE_FILE blocks
    const createMatches = Array.from(response.matchAll(/CREATE_FILE:\s*(\S+)\s*\n```[\w]*\n([\s\S]*?)```/g));
    if (createMatches.length > 0) {
      createMatches.forEach(match => {
        const filename = match[1];
        const content = match[2].trim();
        setCurrentOperation(`Creating ${filename}`);
        onCodingFile(filename);
        const ext = filename.split('.').pop() || 'txt';
        const existingFile = files.find(f => f.file_path === filename);
        newChanges.set(filename, { 
          oldContent: existingFile?.file_content || '', 
          newContent: content, 
          type: existingFile ? 'update' : 'create' 
        });
        onCreateFile(filename, content, ext);
        toast({ title: '✓', description: `Created ${filename}`, duration: 1500 });
      });
      setFileChanges(newChanges);
      setCurrentOperation(null);
      onCodingFile(null);
      return;
    }
    
    // Single CREATE_FILE
    if (response.includes('CREATE_FILE:')) {
      const match = response.match(/CREATE_FILE:\s*(\S+)/);
      if (match) {
        const filename = match[1];
        onCodingFile(filename);
        const ext = filename.split('.').pop() || 'txt';
        const contentMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
        const content = contentMatch ? contentMatch[1].trim() : '';
        const existingFile = files.find(f => f.file_path === filename);
        newChanges.set(filename, { oldContent: existingFile?.file_content || '', newContent: content, type: existingFile ? 'update' : 'create' });
        setFileChanges(newChanges);
        onCreateFile(filename, content, ext);
        toast({ title: '✓', description: `Created ${filename}`, duration: 1500 });
        onCodingFile(null);
        return;
      }
    }
    
    // Delete files
    if (response.includes('DELETE_FILE:')) {
      const matches = response.matchAll(/DELETE_FILE:\s*(\S+)/g);
      const filenames = Array.from(matches).map(m => m[1]);
      filenames.forEach(f => {
        const existingFile = files.find(file => file.file_path === f);
        if (existingFile) {
          newChanges.set(f, { oldContent: existingFile.file_content, newContent: '', type: 'delete' });
        }
        onDeleteFile(f);
      });
      setFileChanges(newChanges);
      if (filenames.length) {
        toast({ title: '✓', description: `Deleted ${filenames.length} file(s)`, duration: 1500 });
      }
      return;
    }
    
    // Apply code to active file
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeMatch && activeFile && !response.includes('CREATE_FILE:')) {
      const newContent = codeMatch[1].trim();
      onCodingFile(activeFile);
      newChanges.set(activeFile, { oldContent: fileContent, newContent, type: 'update' });
      setFileChanges(newChanges);
      onUpdateFile(newContent);
      toast({ title: '✓', description: activeFile, duration: 1500 });
      onCodingFile(null);
    }
  };

  const handleUndoFile = (filePath: string) => {
    const change = fileChanges.get(filePath);
    if (!change) return;
    if (change.type === 'create') {
      onDeleteFile(filePath);
    } else if (change.type === 'update') {
      onUpdateFile(change.oldContent);
    }
    setUndoneFiles(prev => new Set(prev).add(filePath));
    toast({ title: 'Undone', description: filePath, duration: 1500 });
  };

  const handleKeepFile = (filePath: string) => {
    setFileChanges(prev => {
      const next = new Map(prev);
      next.delete(filePath);
      return next;
    });
    toast({ title: '✓ Kept', description: filePath, duration: 1500 });
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
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
              <p className="text-xs text-muted-foreground">Powered by GPT-5</p>
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
            <Badge variant="outline" className="ml-auto text-xs">{files.length} files</Badge>
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">AI Copilot Ready</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Ask me to write code, create files, or build features.
              </p>
              <SuggestionChips suggestions={AI_SUGGESTIONS} onSelect={handleSuggestionClick} />
            </div>
          )}
          
          {messages.map((message, index) => {
            let displayContent = message.content;
            let operationBadge = null;
            let changedFiles: string[] = [];
            
            if (message.role === "assistant") {
              if (message.content.includes('CREATE_FILE:')) {
                const matches = Array.from(message.content.matchAll(/CREATE_FILE:\s*(\S+)/g));
                if (matches.length) {
                  changedFiles = matches.map(m => m[1]);
                  operationBadge = (
                    <Badge className="mb-2 bg-primary/20 text-primary animate-fade-in border border-primary/30">
                      ✓ Created {changedFiles.join(', ')}
                    </Badge>
                  );
                  displayContent = displayContent.replace(/CREATE_FILE:\s*\S+/g, '').trim();
                }
              }
              if (message.content.includes('DELETE_FILE:')) {
                const match = message.content.match(/DELETE_FILE:\s*(\S+)/);
                if (match) {
                  changedFiles = [match[1]];
                  operationBadge = (
                    <Badge className="mb-2 bg-destructive/20 text-destructive animate-fade-in border border-destructive/30">
                      ✓ Deleted {match[1]}
                    </Badge>
                  );
                  displayContent = displayContent.replace(/DELETE_FILE:\s*\S+/g, '').trim();
                }
              }
              
              if (displayContent.includes('```')) {
                const beforeCode = displayContent.split('```')[0].trim();
                const hasCode = /```[\s\S]*?```/.test(displayContent);
                if (!operationBadge && hasCode && activeFile) {
                  changedFiles = [activeFile];
                  operationBadge = (
                    <Badge className="mb-2 bg-primary/20 text-primary animate-fade-in border border-primary/30">
                      <Code className="w-3 h-3 mr-1 inline" /> ✓ Applied to {activeFile}
                    </Badge>
                  );
                }
                displayContent = beforeCode || '✓';
              }
            }
            
            const isLatestAssistant = message.role === 'assistant' && index === messages.length - 1;
            
            return (
              <div key={index} className={cn("flex gap-4 animate-fade-in", message.role === "user" ? "justify-end" : "justify-start")}>
                {message.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 max-w-[85%]">
                  {operationBadge}
                  <div className={cn(
                    "rounded-2xl px-5 py-3 shadow-md",
                    message.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ml-auto"
                      : "bg-gradient-to-br from-card to-card/80 border border-primary/10"
                  )}>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{displayContent}</p>
                  </div>
                  
                  {/* Keep / Undo with diff via FileChangePanel */}
                  {message.role === 'assistant' && changedFiles.length > 0 && !isLoading && (
                    <FileChangePanel
                      fileChanges={new Map(changedFiles.filter(fp => fileChanges.has(fp) || undoneFiles.has(fp)).map(fp => [fp, fileChanges.get(fp) || { oldContent: '', newContent: '', type: 'create' as const }]))}
                      undoneFiles={undoneFiles}
                      onKeep={handleKeepFile}
                      onUndo={handleUndoFile}
                      onFileClick={onSelectFile}
                    />
                  )}
                  
                  {isLatestAssistant && !isLoading && (
                    <SuggestionChips 
                      suggestions={['Add more features', 'Fix any bugs', 'Improve styling', 'Add tests']} 
                      onSelect={handleSuggestionClick} 
                    />
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-primary-foreground font-semibold text-sm">You</span>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Live AI activity indicator */}
          {isLoading && (
            <AiActivityIndicator stage={aiStage} detail={stageDetail} />
          )}
        </div>
      </ScrollArea>

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
              placeholder="Ask AI to write code, create files..."
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

const getLanguageFromFile = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
    'html': 'html', 'css': 'css', 'scss': 'scss', 'json': 'json', 'md': 'markdown',
    'py': 'python', 'java': 'java', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp',
    'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust', 'sql': 'sql',
    'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml',
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
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
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
  const [rightPanelTab, setRightPanelTab] = useState<string>('copilot');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showDeployOverlay, setShowDeployOverlay] = useState(false);

  const { collaborators, setEditor } = useCollaboration(
    projectId || '', profile?.id || '', activeFile
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile && !isNewProject) saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowFileSearch(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, fileContent, isNewProject]);

  // Auto-save
  useEffect(() => {
    if (!project || !activeFile || isNewProject) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

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
            setFiles(files.map(f => f.file_path === activeFile ? { ...f, file_content: fileContent } : f));
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
          }
        }
      } catch { setAutoSaveStatus('idle'); }
    }, 2000);

    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [fileContent, activeFile, project, isNewProject]);

  useEffect(() => {
    if (loading) { setPageLoading(true); return; }
    if (!user) { navigate('/auth'); return; }

    if (projectId === 'new') {
      setIsNewProject(true);
      setPageLoading(false);
      const defaultFiles = [
        {
          id: 'temp-1', file_path: 'index.html',
          file_content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My BulbAI Project</title>\n    <style>\n        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }\n        .container { max-width: 600px; background: white; padding: 3rem; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }\n        h1 { color: #2563eb; margin: 0 0 1rem 0; }\n        p { color: #64748b; line-height: 1.6; }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <h1>✨ Welcome to BulbAI</h1>\n        <p>Start building something amazing!</p>\n    </div>\n</body>\n</html>`,
          file_type: 'html'
        },
        {
          id: 'temp-2', file_path: 'README.md',
          file_content: `# My BulbAI Project\n\nCreated with BulbAI.\n\n## Getting Started\n\nEdit files to build your project!`,
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

  useEffect(() => {
    if (codingFile) { setShowAICodingScreen(true); return; }
    const timeout = setTimeout(() => setShowAICodingScreen(false), 700);
    return () => clearTimeout(timeout);
  }, [codingFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      const content = await file.text();
      setFiles(prev => [...prev, { id: `temp-${Date.now()}`, file_path: file.name, file_content: content, file_type: file.name.split('.').pop() || 'txt' }]);
      toast({ title: 'File uploaded', description: file.name, duration: 1500 });
    }
  };

  const downloadProject = async () => {
    const zip = new JSZip();
    files.forEach(file => zip.file(file.file_path, file.file_content));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.title || 'project'}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'ZIP saved', duration: 1500 });
  };

  const fetchProject = async () => {
    setPageLoading(true);
    try {
      const { data: projectData, error: projectError } = await supabase.from('projects').select('*').eq('id', projectId).single();
      if (projectError) throw projectError;
      setProject(projectData);

      const { data: filesData, error: filesError } = await supabase.from('project_files').select('*').eq('project_id', projectId).order('file_path');
      if (filesError) throw filesError;
      setFiles(filesData);
      if (filesData.length > 0) { setActiveFile(filesData[0].file_path); setFileContent(filesData[0].file_content); }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to load project', variant: 'destructive' });
    } finally { setPageLoading(false); }
  };

  const createProject = async () => {
    if (!profile || !projectTitle.trim()) { toast({ title: 'Error', description: 'Enter a title', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { data: projectData, error: projectError } = await supabase.from('projects').insert({ title: projectTitle, description: projectDescription, owner_id: profile.id, tags: projectTags, visibility: 'private' }).select().single();
      if (projectError) throw projectError;
      const { error: filesError } = await supabase.from('project_files').insert(files.map(f => ({ project_id: projectData.id, file_path: f.file_path, file_content: f.file_content, file_type: f.file_type })));
      if (filesError) throw filesError;
      toast({ title: 'Success', description: 'Project created!' });
      navigate(`/workspace/${projectData.id}`);
    } catch (error) { toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const saveFile = async () => {
    if (!project || !activeFile) return;
    setSaving(true);
    try {
      const fileToUpdate = files.find(f => f.file_path === activeFile);
      if (fileToUpdate) {
        const { error } = await supabase.from('project_files').update({ file_content: fileContent }).eq('id', fileToUpdate.id);
        if (error) throw error;
      }
      setFiles(files.map(f => f.file_path === activeFile ? { ...f, file_content: fileContent } : f));
      toast({ title: 'Saved', duration: 1500 });
    } catch { toast({ title: 'Error', description: 'Save failed', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const addTag = () => { if (newTag.trim() && !projectTags.includes(newTag.trim())) { setProjectTags([...projectTags, newTag.trim()]); setNewTag(''); } };
  const removeTag = (t: string) => setProjectTags(projectTags.filter(tag => tag !== t));

  const selectFile = (filePath: string) => {
    const file = files.find(f => f.file_path === filePath);
    if (file) {
      setActiveFile(filePath);
      setFileContent(file.file_content);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), { content: file.file_content, file: filePath }]);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const handleUndo = () => { if (historyIndex > 0) { const prev = history[historyIndex - 1]; setFileContent(prev.content); setActiveFile(prev.file); setHistoryIndex(historyIndex - 1); } };
  const handleRedo = () => { if (historyIndex < history.length - 1) { const next = history[historyIndex + 1]; setFileContent(next.content); setActiveFile(next.file); setHistoryIndex(historyIndex + 1); } };

  const handleCopilotUpdateFile = async (content: string) => {
    setFileContent(content);
    if (project && activeFile) {
      try {
        const fileToUpdate = files.find(f => f.file_path === activeFile);
        if (fileToUpdate) {
          await supabase.from('project_files').update({ file_content: content }).eq('id', fileToUpdate.id);
          setFiles(files.map(f => f.file_path === activeFile ? { ...f, file_content: content } : f));
        }
      } catch {}
    }
  };

  const handleCopilotCreateFile = async (path: string, content: string, type: string) => {
    if (!project) {
      setFiles([...files, { id: `temp-${Date.now()}`, file_path: path, file_content: content, file_type: type }]);
      setActiveFile(path); setFileContent(content);
    } else {
      try {
        const { data, error } = await supabase.from('project_files').insert({ project_id: project.id, file_path: path, file_content: content, file_type: type }).select().single();
        if (error) throw error;
        setFiles([...files, data]); setActiveFile(path); setFileContent(content);
      } catch {}
    }
  };

  const handleCopilotDeleteFile = async (path: string) => {
    if (!project) {
      setFiles(files.filter(f => f.file_path !== path));
    } else {
      const file = files.find(f => f.file_path === path);
      if (file) await supabase.from('project_files').delete().eq('id', file.id);
      setFiles(files.filter(f => f.file_path !== path));
    }
    if (activeFile === path) {
      const remaining = files.filter(f => f.file_path !== path);
      if (remaining.length) selectFile(remaining[0].file_path);
      else { setActiveFile(null); setFileContent(''); }
    }
  };

  const handleMoveFile = async (sourcePath: string, targetFolder: string) => {
    const file = files.find(f => f.file_path === sourcePath);
    if (!file) return;
    
    const fileName = sourcePath.split('/').pop();
    const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName!;
    
    if (newPath === sourcePath) return;
    
    if (project) {
      const { error } = await supabase.from('project_files').update({ file_path: newPath }).eq('id', file.id);
      if (error) { toast({ title: 'Error', description: 'Failed to move file', variant: 'destructive' }); return; }
    }
    
    setFiles(files.map(f => f.file_path === sourcePath ? { ...f, file_path: newPath } : f));
    if (activeFile === sourcePath) setActiveFile(newPath);
    toast({ title: 'Moved', description: `${fileName} → ${targetFolder || 'root'}`, duration: 1500 });
  };

  const handleCommit = async (message: string) => {
    if (!project || !profile) return;
    try {
      // Save snapshot
      await supabase.from('project_snapshots').insert({
        project_id: project.id,
        user_id: user!.id,
        message,
        snapshot_type: 'save',
        files_snapshot: files.map(f => ({ file_path: f.file_path, file_content: f.file_content, file_type: f.file_type }))
      });
      
      // Save commit
      await supabase.from('project_commits').insert({
        project_id: project.id,
        user_id: profile.id,
        commit_hash: Math.random().toString(36).slice(2, 9),
        commit_message: message,
        files_changed: files.map(f => f.file_path)
      });
      
      toast({ title: 'Committed', description: message, duration: 2000 });
    } catch {}
  };

  const handleRestoreSnapshot = (restoredFiles: Array<{ file_path: string; file_content: string; file_type: string }>) => {
    if (!project) return;
    // Replace all files with snapshot
    setFiles(restoredFiles.map((f, i) => ({ id: `restored-${i}`, ...f })));
    if (restoredFiles.length > 0) {
      setActiveFile(restoredFiles[0].file_path);
      setFileContent(restoredFiles[0].file_content);
    }
    // Re-save all files to Supabase
    restoredFiles.forEach(async (f) => {
      await supabase.from('project_files').upsert({
        project_id: project.id,
        file_path: f.file_path,
        file_content: f.file_content,
        file_type: f.file_type
      }, { onConflict: 'project_id,file_path' }).select();
    });
  };

  const handleCreateNewFile = () => {
    if (!newFileName.trim()) return;
    const fileName = selectedFolder && !newFileName.includes('/') ? `${selectedFolder}/${newFileName}` : newFileName;
    handleCopilotCreateFile(fileName, '// New file\n', fileName.split('.').pop() || 'txt');
    setNewFileName(''); setShowNewFileDialog(false);
  };

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) return;
    const folderPath = selectedFolder ? `${selectedFolder}/${newFolderName}` : newFolderName;
    handleCopilotCreateFile(`${folderPath}/.gitkeep`, '', 'txt');
    setNewFolderName(''); setShowNewFolderDialog(false);
  };

  if (pageLoading) return <LoadingScreen message="Loading workspace..." />;

  if (isNewProject) {
    return (
      <div className="h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
            <p className="text-muted-foreground">Set up your project details</p>
          </div>
          <Card>
            <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="My Awesome Project" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="What does your project do?" rows={3} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex gap-2 mb-2">
                  <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTag()} placeholder="Add tags..." className="flex-1" />
                  <Button onClick={addTag} variant="outline"><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {projectTags.map((tag) => (<Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>{tag} ×</Badge>))}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button onClick={() => navigate('/dashboard')} variant="outline">Cancel</Button>
                <Button onClick={createProject} disabled={saving || !projectTitle.trim()}>{saving ? 'Creating...' : 'Create Project'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* AI Coding Screen Overlay */}
      <AICodingScreen isActive={showAICodingScreen && codingFile !== null} filename={codingFile || 'code'} code={fileContent} onClose={() => setShowAICodingScreen(false)} />

      {/* Deployment Overlay */}
      {project && (
        <DeploymentOverlay
          isOpen={showDeployOverlay}
          onClose={() => setShowDeployOverlay(false)}
          projectId={project.id}
          projectName={project.title}
          files={files}
          onDeployComplete={(url) => {
            // Save deploy snapshot
            if (user) {
              supabase.from('project_snapshots').insert({
                project_id: project.id,
                user_id: user.id,
                message: `Deployed to ${url}`,
                snapshot_type: 'deploy',
                files_snapshot: files.map(f => ({ file_path: f.file_path, file_content: f.file_content, file_type: f.file_type }))
              });
            }
          }}
        />
      )}

      {/* Presence */}
      {project && user && <PresenceIndicator projectId={project.id} currentUserId={user.id} />}

      {/* Header */}
      <div className="border-b bg-card/50 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="hidden md:flex">← Dashboard</Button>
          <h1 className="font-semibold text-sm md:text-base">{project?.title || 'Workspace'}</h1>
          {project && <Badge variant={project.visibility === 'public' ? 'default' : 'secondary'}>{project.visibility}</Badge>}
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={historyIndex <= 0} className={cn(historyIndex <= 0 && "opacity-40", historyIndex > 0 && "glow-white", "hidden sm:flex")} title="Undo">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className={cn(historyIndex >= history.length - 1 && "opacity-40", historyIndex < history.length - 1 && "glow-white", "hidden sm:flex")} title="Redo">
            <Redo2 className="w-4 h-4" />
          </Button>
          {autoSaveStatus !== 'idle' && (
            <span className={cn("text-xs px-2 py-1 rounded-md ml-2 hidden sm:inline-flex items-center gap-1", autoSaveStatus === 'saving' && "text-muted-foreground", autoSaveStatus === 'saved' && "text-green-500")}>
              {autoSaveStatus === 'saving' ? <><Loader2 className="w-3 h-3 animate-spin" />Saving...</> : <>✓ Saved</>}
            </span>
          )}
          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
          <Button variant="ghost" size="sm" onClick={() => setShowFileSearch(true)} title="Search (Ctrl+P)" className="hidden sm:flex"><Search className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={downloadProject} title="Download" className="hidden sm:flex"><Download className="w-4 h-4" /></Button>
          <div className="w-px h-6 bg-border mx-1 hidden md:block" />
          <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
            <Share2 className="w-3 h-3 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">Share</span>
          </Button>
          <Button onClick={saveFile} disabled={saving} size="sm">
            <Save className="w-3 h-3 md:w-4 md:h-4 md:mr-2" /><span className="hidden md:inline">{saving ? 'Saving...' : 'Save'}</span>
          </Button>
          <div className="w-px h-6 bg-border mx-2 hidden md:block" />
          {user && <NotificationCenter userId={user.id} />}
          {user && <UserProfileMenu userId={user.id} />}
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-green-500/25 transition-all hover:scale-105 btn-shine"
            onClick={() => setShowDeployOverlay(true)}
          >
            <Rocket className="w-4 h-4 mr-2 animate-bounce" />
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
                  <FolderOpen className="w-4 h-4" /><span className="font-medium">Files</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewFileDialog(true)}>
                    <File className="w-3 h-3 mr-1" />File
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowNewFolderDialog(true)}>
                    <FolderOpen className="w-3 h-3 mr-1" />Folder
                  </Button>
                </div>
              </div>
              <div className="p-2 flex-1 overflow-y-auto">
                <FileTree
                  files={files}
                  activeFile={activeFile}
                  onSelectFile={selectFile}
                  onCreateFile={(path) => handleCopilotCreateFile(path, '// New file\n', path.split('.').pop() || 'txt')}
                  onDeleteFiles={(paths) => paths.forEach(p => handleCopilotDeleteFile(p))}
                  onRenameFile={(oldPath, newPath) => {
                    const file = files.find(f => f.file_path === oldPath);
                    if (file && project) {
                      supabase.from('project_files').update({ file_path: newPath }).eq('id', file.id).then(() => {
                        fetchProject();
                        toast({ title: 'Renamed', description: `${oldPath} → ${newPath}` });
                      });
                    }
                  }}
                  onMoveFile={handleMoveFile}
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
              <div className="md:hidden border-b bg-muted/20 p-2">
                <Select value={activeFile || ''} onValueChange={selectFile}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a file" /></SelectTrigger>
                  <SelectContent>
                    {files.map((f) => (<SelectItem key={f.file_path} value={f.file_path}>{f.file_path}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border-b bg-muted/20 px-4 py-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {activeFile && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-sm border">
                      <File className="w-3 h-3" /><span className="text-sm">{activeFile}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language={getLanguageFromFile(activeFile || '')}
                  value={fileContent}
                  theme="vs-dark"
                  onChange={(value) => setFileContent(value || '')}
                  onMount={(editor) => { editorRef.current = editor; setEditor(editor); }}
                  options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: 'on' }}
                />
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Right Panel - Reordered Tabs: AI, Review, Deploy, Terminal, History */}
          <ResizablePanel defaultSize={40} minSize={30} className="hidden lg:flex flex-col">
            <div className="flex-shrink-0 border-b bg-gradient-to-r from-card/50 to-muted/30">
              <Tabs value={rightPanelTab} onValueChange={setRightPanelTab}>
                <ScrollArea className="w-full">
                  <TabsList className="inline-flex h-11 items-center gap-1 rounded-none bg-transparent p-1">
                    <TabsTrigger value="copilot" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Bot className="w-3.5 h-3.5 mr-1.5" />AI
                    </TabsTrigger>
                    <TabsTrigger value="review" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />Review
                    </TabsTrigger>
                    <TabsTrigger value="deploy" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Rocket className="w-3.5 h-3.5 mr-1.5" />Deploy
                    </TabsTrigger>
                    <TabsTrigger value="terminal" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <TerminalIcon className="w-3.5 h-3.5 mr-1.5" />Terminal
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />History
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
                  projectId={project?.id}
                  onSelectFile={(path) => {
                    const file = files.find(f => f.file_path === path);
                    if (file) {
                      setActiveFile(file.file_path);
                      setFileContent(file.file_content || '');
                    }
                  }}
                />
              )}
              {rightPanelTab === 'review' && (
                <CodeReviewPanel fileName={activeFile || 'untitled'} fileContent={fileContent} language={getLanguageFromFile(activeFile || '')} />
              )}
              {rightPanelTab === 'deploy' && project && (
                <DeploymentPanel projectId={project.id} projectName={project.title} visibility={project.visibility} onVisibilityChange={(v) => setProject({ ...project, visibility: v })} />
              )}
              {rightPanelTab === 'terminal' && (
                <Terminal 
                  onClose={() => {}} 
                  files={files} 
                  onCreateFile={handleCopilotCreateFile}
                  onDeleteFile={handleCopilotDeleteFile}
                  onCommit={handleCommit}
                  projectName={project?.title}
                />
              )}
              {rightPanelTab === 'history' && project && user && (
                <HistoryPanel projectId={project.id} userId={user.id} onRestore={handleRestoreSnapshot} />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile preview */}
      <div className="fixed bottom-6 right-6 z-10 lg:hidden">
        <Button variant="secondary" className="rounded-full w-12 h-12 shadow-lg" onClick={() => {
          const htmlFile = files.find(f => f.file_path === 'index.html');
          if (htmlFile) { const blob = new Blob([htmlFile.file_content], { type: 'text/html' }); window.open(URL.createObjectURL(blob), '_blank'); }
        }} title="Preview">
          <Play className="w-5 h-5" />
        </Button>
      </div>

      {/* Dialogs */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              {selectedFolder ? `Creating in: ${selectedFolder}/` : 'Creating in project root'}
            </DialogDescription>
          </DialogHeader>
          <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="filename.ext" onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateNewFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              {selectedFolder ? `Creating in: ${selectedFolder}/` : 'Creating in project root'}
            </DialogDescription>
          </DialogHeader>
          <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="folder-name" onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFolder()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateNewFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileSearch open={showFileSearch} onOpenChange={setShowFileSearch} files={files.map(f => ({ path: f.file_path, type: 'file' as const }))} onSelectFile={(path) => { const f = files.find(f => f.file_path === path); if (f) { setActiveFile(path); setFileContent(f.file_content); } }} />

      {isDragging && (
        <div className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-primary">
          <div className="text-center">
            <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Drop files to upload</h2>
          </div>
        </div>
      )}

      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} files={files} onSelectFile={(path) => { const f = files.find(f => f.file_path === path); if (f) { setActiveFile(path); setFileContent(f.file_content); } }} onOpenPanel={(panel) => {
        if (panel === 'deployment') setRightPanelTab('deploy');
        else if (panel === 'terminal') setRightPanelTab('terminal');
        else if (panel === 'review') setRightPanelTab('review');
      }} />
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} projectUrl={`https://bulbai.app/p/${project?.id || ''}`} projectName={project?.title || 'My Project'} isPublic={project?.visibility === 'public'} />
    </div>
  );
}

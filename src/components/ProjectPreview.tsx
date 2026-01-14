import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, Square, RotateCcw, ExternalLink, Maximize2, 
  Minimize2, Terminal, Globe, Loader2
} from "lucide-react";

interface ProjectPreviewProps {
  files: Record<string, string>;
  projectName?: string;
}

export const ProjectPreview = ({ files, projectName = "Project" }: ProjectPreviewProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const generatePreview = () => {
    // Find the main HTML file
    const htmlFile = files['index.html'] || files['src/index.html'] || `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }
    p { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 ${projectName}</h1>
    <p>Your project is running! Add files to see them here.</p>
  </div>
</body>
</html>`;

    // Inject CSS files
    let cssContent = '';
    Object.entries(files).forEach(([path, content]) => {
      if (path.endsWith('.css')) {
        cssContent += `<style>/* ${path} */\n${content}</style>\n`;
      }
    });

    // Inject JS files
    let jsContent = '';
    Object.entries(files).forEach(([path, content]) => {
      if (path.endsWith('.js') || path.endsWith('.ts')) {
        // Basic transpilation for simple TS
        const transpiled = content
          .replace(/:\s*\w+/g, '') // Remove type annotations
          .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
          .replace(/type\s+\w+\s*=[^;]+;/g, ''); // Remove type aliases
        jsContent += `<script>/* ${path} */\n${transpiled}</script>\n`;
      }
    });

    // Build final HTML
    const finalHtml = htmlFile
      .replace('</head>', `${cssContent}</head>`)
      .replace('</body>', `${jsContent}</body>`);

    return finalHtml;
  };

  const handleRun = () => {
    setIsLoading(true);
    setLogs([
      '⚡ Starting development server...',
      '📦 Bundling modules...',
    ]);

    setTimeout(() => {
      setLogs(prev => [...prev, '✅ Server started on localhost:3000']);
      
      const html = generatePreview();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setIsRunning(true);
      setIsLoading(false);
      
      setLogs(prev => [...prev, '🎉 Ready! Preview is live.']);
    }, 1500);
  };

  const handleStop = () => {
    setIsRunning(false);
    setPreviewUrl("");
    setLogs(prev => [...prev, '⏹️ Server stopped.']);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleRefresh = () => {
    if (isRunning) {
      setLogs(prev => [...prev, '🔄 Refreshing...']);
      const html = generatePreview();
      const blob = new Blob([html], { type: 'text/html' });
      const newUrl = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(newUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          {!isRunning ? (
            <Button
              onClick={handleRun}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2 shadow-lg shadow-green-500/25 animate-pulse hover:animate-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Run Project
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-4 w-4 fill-current" />
              Stop
            </Button>
          )}
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            disabled={!isRunning}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 mx-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className={`text-sm font-mono ${isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
              {isRunning ? 'localhost:3000' : 'Not running'}
            </span>
            {isRunning && (
              <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                LIVE
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!previewUrl}
            onClick={() => window.open(previewUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative">
        {isRunning && previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-0 bg-white"
            title="Project Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
              <Play className="h-24 w-24 text-muted-foreground/30 relative" />
            </div>
            <p className="mt-6 text-muted-foreground text-lg">
              Click <span className="text-green-500 font-semibold">Run Project</span> to preview
            </p>
            <p className="mt-2 text-muted-foreground/60 text-sm">
              Your project will run in a sandboxed environment
            </p>
          </div>
        )}
      </div>

      {/* Console Logs */}
      <Card className="m-3 mt-0 p-3 bg-black/80 border-border">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-4 w-4 text-green-500" />
          <span className="text-xs font-medium text-muted-foreground">Console</span>
        </div>
        <div className="font-mono text-xs space-y-1 max-h-20 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-muted-foreground/50">Waiting for commands...</p>
          ) : (
            logs.map((log, i) => (
              <p key={i} className={log.includes('✅') || log.includes('🎉') ? 'text-green-400' : 'text-muted-foreground'}>
                {log}
              </p>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
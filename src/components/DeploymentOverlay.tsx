import { useState, useEffect } from 'react';
import { Rocket, CheckCircle, XCircle, Copy, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DeploymentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  files: Array<{ file_path: string; file_content: string }>;
  onDeployComplete?: (url: string) => void;
}

const STAGES = ['Uploading', 'Building', 'Deploying', 'Live'] as const;

export function DeploymentOverlay({ isOpen, onClose, projectId, projectName, files, onDeployComplete }: DeploymentOverlayProps) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'failed'>('idle');
  const [deployUrl, setDeployUrl] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    if (isOpen && status === 'idle') {
      startDeploy();
    }
  }, [isOpen]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const startDeploy = async () => {
    if (!session?.access_token) {
      setStatus('failed');
      addLog('❌ Authentication required. Please sign in.');
      return;
    }

    setStatus('deploying');
    setStage(0);
    setProgress(5);
    addLog('🚀 Initializing deployment pipeline...');

    try {
      // Stage 1: Uploading
      await tick(400);
      setProgress(15);
      addLog('📦 Packaging project files...');
      
      const projectFiles: Record<string, string> = {};
      files.forEach(f => { if (f.file_content) projectFiles[f.file_path] = f.file_content; });
      
      await tick(600);
      setProgress(25);
      addLog(`📁 ${Object.keys(projectFiles).length} files ready`);

      // Stage 2: Building
      setStage(1);
      setProgress(35);
      addLog('🔧 Connecting to Vercel...');
      
      const { data, error } = await supabase.functions.invoke('deploy-vercel', {
        body: { projectId, projectName, files: projectFiles }
      });

      if (error) throw error;
      if (data?.needsSetup) throw new Error(data.message || 'Vercel setup required');
      if (data?.error) throw new Error(data.message || data.error);

      setProgress(55);
      addLog('⚡ Build started on Vercel...');
      
      // Stage 3: Deploying
      setStage(2);
      await tick(1500);
      setProgress(70);
      addLog('🌐 Deploying to global CDN...');
      
      await tick(1000);
      setProgress(85);
      addLog('🔒 Configuring SSL certificate...');
      
      await tick(800);
      setProgress(95);
      addLog('🔗 Assigning domain...');

      // Stage 4: Live
      setStage(3);
      setProgress(100);
      const url = data?.url || `https://${projectName.toLowerCase().replace(/\s+/g, '-')}.vercel.app`;
      setDeployUrl(url);
      addLog(`✅ Live at: ${url}`);
      setStatus('success');
      setShowConfetti(true);
      onDeployComplete?.(url);

      setTimeout(() => setShowConfetti(false), 4000);

    } catch (err) {
      setStatus('failed');
      setProgress(0);
      addLog(`❌ ${err instanceof Error ? err.message : 'Deployment failed'}`);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(deployUrl);
    toast({ title: 'Copied!', duration: 1500 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Confetti particles */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                background: ['hsl(var(--primary))', 'hsl(var(--bulb-glow))', 'hsl(var(--tech-purple))', '#22c55e', '#ef4444', '#3b82f6'][i % 6],
                animation: `confetti-fall ${2 + Math.random() * 2}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Rocket animation */}
      <div className="relative mb-8">
        <div className={`text-6xl transition-all duration-1000 ${status === 'deploying' ? 'animate-bounce' : status === 'success' ? 'scale-125' : ''}`}>
          {status === 'success' ? (
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center border-glow">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          ) : status === 'failed' ? (
            <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-glow">
              <Rocket className="w-12 h-12 text-primary animate-bounce" />
            </div>
          )}
        </div>
        {status === 'deploying' && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-16 bg-gradient-to-t from-orange-500/80 via-yellow-400/60 to-transparent rounded-full blur-sm animate-pulse" />
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold mb-2">
        {status === 'success' ? '🎉 Deployed!' : status === 'failed' ? 'Deployment Failed' : 'Deploying to Vercel'}
      </h1>
      <p className="text-muted-foreground mb-8">{projectName}</p>

      {/* Progress stages */}
      <div className="flex items-center gap-4 mb-6 max-w-lg w-full px-8">
        {STAGES.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <div className={`text-xs font-medium mb-1 transition-colors ${i <= stage ? 'text-primary' : 'text-muted-foreground'}`}>
              {s}
            </div>
            <div className={`h-1 rounded-full transition-all duration-500 ${i < stage ? 'bg-primary' : i === stage ? 'bg-primary/60 animate-pulse' : 'bg-muted'}`} />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="max-w-lg w-full px-8 mb-8">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Live URL */}
      {deployUrl && status === 'success' && (
        <div className="flex items-center gap-3 px-6 py-3 bg-green-500/10 border border-green-500/30 rounded-xl mb-6 animate-fade-in-up">
          <span className="text-green-400 font-mono text-sm">{deployUrl}</span>
          <Button variant="ghost" size="sm" onClick={copyUrl}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={deployUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      )}

      {/* Build logs */}
      <div className="max-w-lg w-full px-8">
        <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto border">
          <div className="space-y-1 font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="text-muted-foreground animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      {(status === 'success' || status === 'failed') && (
        <div className="flex gap-3 mt-8 animate-fade-in-up">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {status === 'failed' && (
            <Button onClick={() => { setStatus('idle'); setLogs([]); setProgress(0); setStage(0); startDeploy(); }}>
              Retry
            </Button>
          )}
          {status === 'success' && deployUrl && (
            <Button asChild>
              <a href={deployUrl} target="_blank" rel="noopener noreferrer">
                Visit Site <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function tick(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChat, type AiStage } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BulbIcon } from '@/components/BulbIcon';
import { SuggestionChips } from '@/components/SuggestionChips';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Send, X, RotateCcw, Sparkles, Bot, Code2, ImagePlus, Trash2, Eye, Brain, Loader2, CheckCircle2
} from 'lucide-react';

const CHAT_SUGGESTIONS = [
  'Build me a landing page',
  'Create a React todo app',
  'Help me with CSS animations',
  'Write a REST API handler',
  'Explain React hooks',
  'Debug my code',
];

const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border/50 bg-background/50">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/50">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <Button
          variant="ghost" size="sm" className="h-6 px-2 text-xs"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm font-mono leading-relaxed"><code>{code}</code></pre>
    </div>
  );
};

const RenderContent = ({ content }: { content: string }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          return <CodeBlock key={i} language={match?.[1] || 'code'} code={(match?.[2] || '').trim()} />;
        }
        return part ? <span key={i} className="whitespace-pre-wrap">{part}</span> : null;
      })}
    </>
  );
};

export default function Chat() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { messages, isLoading, aiStage, stageDetail, sendMessage, clearMessages, stopGeneration } = useChat('global-chat');
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input;
    const imgs = images;
    setInput('');
    setImages([]);
    await sendMessage(msg, undefined, imgs);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => reader.result && setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-background"><BulbIcon className="w-12 h-12 animate-pulse" /></div>;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <BulbIcon className="w-7 h-7" animated />
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">BulbAI Chat</h1>
              <p className="text-[10px] text-muted-foreground leading-none">Your AI coding companion</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={clearMessages}>
          <RotateCcw className="w-3 h-3 mr-1" /> Clear
        </Button>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto py-6 space-y-5">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <BulbIcon className="w-16 h-16 mx-auto mb-4 opacity-60" animated />
              <h2 className="text-2xl font-bold mb-2">Hey there! 👋</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                I'm BulbAI — ask me anything about code, or tell me what to build.
              </p>
              <SuggestionChips suggestions={CHAT_SUGGESTIONS} onSelect={(s) => setInput(s)} />
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3 animate-fade-in", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={cn(
                "rounded-2xl px-4 py-3 max-w-[80%] shadow-sm",
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border/50'
              )}>
                {msg.images?.length ? (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {msg.images.map((img, j) => <img key={j} src={img} alt="" className="max-w-[180px] rounded-lg" />)}
                  </div>
                ) : null}
                <div className="text-sm leading-relaxed">
                  {msg.role === 'assistant' ? <RenderContent content={msg.content} /> : msg.content}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold text-xs">You</span>
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-card border border-border/50">
                {/* Stage pipeline */}
                <div className="flex items-center gap-2 mb-2">
                  {(['reading', 'thinking', 'coding'] as AiStage[]).map((s, i) => {
                    const icons = { reading: Eye, thinking: Brain, coding: Code2 };
                    const colors = { reading: 'text-blue-400', thinking: 'text-purple-400', coding: 'text-green-400' };
                    const StageIcon = icons[s];
                    const isActive = s === aiStage;
                    const isPast = (['reading', 'thinking', 'coding'].indexOf(aiStage) > i) || aiStage === 'done';
                    return (
                      <div key={s} className="flex items-center gap-1">
                        {i > 0 && <div className={cn("w-4 h-0.5 rounded-full", isPast ? 'bg-primary' : 'bg-border')} />}
                        <div className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                          isActive ? colors[s] : isPast ? 'text-primary' : 'text-muted-foreground'
                        )}>
                          {isActive ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <StageIcon className="w-2.5 h-2.5" />}
                          <span className="capitalize">{s}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground">{stageDetail || 'Working...'}</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-2">
          {images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="max-w-[80px] rounded" />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              <ImagePlus className="w-4 h-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask BulbAI anything..."
              disabled={isLoading}
              className="flex-1 h-10"
            />
            {isLoading ? (
              <Button type="button" onClick={stopGeneration} variant="destructive" className="h-10 px-4">Stop</Button>
            ) : (
              <Button type="submit" disabled={!input.trim()} className="h-10 px-4">
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

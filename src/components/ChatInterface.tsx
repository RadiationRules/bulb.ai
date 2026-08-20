import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MessageCircle, Minimize2, Send, RotateCcw, ImagePlus, Trash2, Sparkles, Zap, Brain, Code2 } from "lucide-react";
import { BulbIcon } from "./BulbIcon";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { LiveCodeOverlay } from "./LiveCodeOverlay";

// Code highlighting component
const CodeHighlight = ({ content }: { content: string }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          const language = match?.[1] || "code";
          const code = (match?.[2] || part.slice(3, -3)).trim();

          return (
            <div
              key={index}
              className="my-3 rounded-lg overflow-hidden border border-border/50 bg-background/50"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {language}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(code);
                        setCopiedIndex(index);
                        window.setTimeout(() => setCopiedIndex(null), 900);
                      } catch {
                        // ignore
                      }
                    }}
                    title="Copy code"
                  >
                    <span className="text-xs text-muted-foreground">
                      {copiedIndex === index ? "Copied" : "Copy"}
                    </span>
                  </Button>
                  <Code2 className="w-3 h-3 text-primary" />
                </div>
              </div>

              <pre className="p-3 overflow-x-auto text-sm font-mono leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

interface ChatInterfaceProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const ChatInterface = ({ isFullscreen, onToggleFullscreen, onClose }: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const { messages, isLoading, currentFile, sendMessage, clearMessages, stopGeneration } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    const viewport = root?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;

    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const messageToSend = input;
    const imagesToSend = images;
    setInput("");
    setImages([]);
    await sendMessage(messageToSend, undefined, imagesToSend);
  };

  // Get current code being generated
  const getCurrentCode = () => {
    if (!isLoading || !currentFile) return null;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      const codeMatch = lastMessage.content.match(/```[\w]*\n?([\s\S]*?)(?:```|$)/);
      return codeMatch?.[1] || null;
    }
    return null;
  };

  if (!isFullscreen) {
    return (
      <Button
        onClick={onToggleFullscreen}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 tech-gradient shadow-lg button-hover-glow"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  const liveCode = getCurrentCode();

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in flex flex-col">
      {/* Live Coding Overlay */}
      {isLoading && currentFile && liveCode && (
        <LiveCodeOverlay 
          code={liveCode} 
          filename={currentFile} 
          isActive={true}
          onClose={stopGeneration}
        />
      )}

      {/* Header */}
      <div className="border-b border-border bg-card/50 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <BulbIcon className="w-8 h-8" animated />
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold bg-gradient-to-r from-tech-blue via-purple-500 to-bulb-glow bg-clip-text text-transparent">
                BulbAI
              </h2>
              {isLoading && currentFile && (
                <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-full animate-pulse">
                  <Code2 className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-mono">Coding {currentFile}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              <p className="text-xs text-muted-foreground">Powered by <span className="text-primary font-semibold">GPT-5</span></p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={clearMessages} title="Clear chat">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleFullscreen}>
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <BulbIcon className="w-16 h-16 mx-auto mb-4 opacity-50" animated />
              <h3 className="text-lg font-semibold mb-2">Welcome to BulbAI</h3>
              <p className="text-muted-foreground">Powered by GPT-5 - Ask me anything!</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start",
                "animate-fade-in"
              )}
            >
              {message.role === "assistant" && (
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue via-purple-500 to-bulb-glow flex items-center justify-center flex-shrink-0 shadow-lg">
                  <BulbIcon className="w-5 h-5" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-xl px-4 py-3 max-w-[80%] shadow-lg",
                  message.role === "user"
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                    : "bg-gradient-to-br from-muted to-muted/80 border border-border/50"
                )}
              >
                {message.images && message.images.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {message.images.map((img, i) => (
                      <img key={i} src={img} alt="Upload" className="max-w-[200px] rounded-lg border border-border/50" />
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">
                  {message.role === "assistant" ? (
                    <CodeHighlight content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
              {message.role === "user" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-primary-foreground font-bold text-sm">You</span>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 animate-fade-in">
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-tech-blue via-purple-500 to-bulb-glow flex items-center justify-center flex-shrink-0 animate-pulse">
                <BulbIcon className="w-5 h-5" />
              </div>
              <div className="rounded-lg px-4 py-3 bg-gradient-to-r from-muted to-muted/50 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">GPT-5 thinking...</span>
                  <Brain className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card/50 p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-2">
          {images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="Upload" className="max-w-[100px] rounded" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={() => removeImage(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask GPT-5 anything..."
              disabled={isLoading}
              className="flex-1"
            />
            {isLoading ? (
              <Button type="button" onClick={stopGeneration} variant="destructive">
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

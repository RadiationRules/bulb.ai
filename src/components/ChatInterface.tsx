import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MessageCircle, Minimize2, Send, Loader2, RotateCcw } from "lucide-react";
import { BulbIcon } from "./BulbIcon";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const ChatInterface = ({ isFullscreen, onToggleFullscreen, onClose }: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages, stopGeneration } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const messageToSend = input;
    setInput("");
    await sendMessage(messageToSend);
  };

  if (!isFullscreen) {
    return (
      <Button
        onClick={onToggleFullscreen}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 tech-gradient shadow-lg button-hover-glow animate-bounce"
        style={{animationDuration: '2s'}}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <BulbIcon className="w-8 h-8" animated />
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
              BulbAI Assistant
            </h2>
            <p className="text-sm text-muted-foreground">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            title="Clear chat"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <BulbIcon className="w-16 h-16 mx-auto mb-4 opacity-50" animated />
              <h3 className="text-lg font-semibold mb-2">Welcome to BulbAI Assistant</h3>
              <p className="text-muted-foreground">Ask me anything about coding, projects, or ideas!</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3 animate-fade-in",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center flex-shrink-0">
                  <BulbIcon className="w-5 h-5" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-lg px-4 py-2 max-w-[80%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-semibold text-sm">You</span>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tech-blue to-bulb-glow flex items-center justify-center flex-shrink-0">
                <BulbIcon className="w-5 h-5" />
              </div>
              <div className="rounded-lg px-4 py-2 bg-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card/50 p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
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
        </form>
      </div>
    </div>
  );
};

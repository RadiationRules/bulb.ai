import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, MessageCircle, Minimize2 } from "lucide-react";
import { BulbIcon } from "./BulbIcon";

interface ChatInterfaceProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const ChatInterface = ({ isFullscreen, onToggleFullscreen, onClose }: ChatInterfaceProps) => {
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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/50 p-4 flex items-center justify-between animate-fade-in-up animation-delay-200">
          <div className="flex items-center space-x-3">
            <BulbIcon className="w-8 h-8 animate-scale-in" animated />
            <div className="animate-fade-in-left animation-delay-400">
              <h2 className="text-xl font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
                BulbAI Assistant
              </h2>
              <p className="text-sm text-muted-foreground">Building • Brainstorming • Coding</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 animate-fade-in-right animation-delay-400">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              className="text-muted-foreground hover:text-foreground hover:scale-110 transition-all duration-200"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:scale-110 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Area - BulbAI Integration */}
        <div className="flex-1 relative bg-background animate-fade-in-up animation-delay-600">
          <div className="absolute inset-0 bg-gradient-to-br from-tech-blue/5 via-transparent to-bulb-glow/5 animate-pulse" style={{animationDuration: '4s'}} />
          <iframe
            src="https://www.chatbase.co/chatbot-iframe/W5ZOQa_6wOPIOFFfMXkIY"
            width="100%"
            style={{ 
              height: "100%", 
              minHeight: "calc(100vh - 80px)", 
              border: "none",
              background: "transparent"
            }}
            className="w-full h-full relative z-10 rounded-lg shadow-2xl"
            title="BulbAI Assistant"
            allow="microphone; camera"
          />
        </div>
      </div>
    </div>
  );
};
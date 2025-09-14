import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, X, MessageCircle, Minimize2, Maximize2 } from "lucide-react";
import { BulbIcon } from "./BulbIcon";

interface ChatInterfaceProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const ChatInterface = ({ isFullscreen, onToggleFullscreen, onClose }: ChatInterfaceProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{id: string, text: string, isUser: boolean}>>([
    { id: '1', text: "Hello! I'm BulbAI, your intelligent assistant for Building, Brainstorming, and Coding. How can I help illuminate your ideas today?", isUser: false }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFrameRef = useRef<HTMLIFrameElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Chatbase when component mounts
  useEffect(() => {
    if (isFullscreen && chatFrameRef.current) {
      // Load the Chatbase embed in fullscreen mode
      const chatbaseScript = document.createElement('script');
      chatbaseScript.innerHTML = `
        (function(){
          if(!window.chatbase||window.chatbase("getState")!=="initialized"){
            window.chatbase=(...arguments)=>{
              if(!window.chatbase.q){window.chatbase.q=[]}
              window.chatbase.q.push(arguments)
            };
            window.chatbase=new Proxy(window.chatbase,{
              get(target,prop){
                if(prop==="q"){return target.q}
                return(...args)=>target(prop,...args)
              }
            })
          }
          const onLoad=function(){
            const script=document.createElement("script");
            script.src="https://www.chatbase.co/embed.min.js";
            script.id="W5ZOQa_6wOPIOFFfMXkIY";
            script.domain="www.chatbase.co";
            document.body.appendChild(script);
            
            // Configure for fullscreen
            setTimeout(() => {
              if (window.chatbase) {
                window.chatbase('init', {
                  chatbotId: 'W5ZOQa_6wOPIOFFfMXkIY',
                  domain: 'www.chatbase.co',
                  theme: {
                    primaryColor: '#3b82f6',
                    backgroundColor: '#0f172a',
                    textColor: '#f8fafc'
                  }
                });
              }
            }, 1000);
          };
          if(document.readyState==="complete"){
            onLoad()
          } else {
            window.addEventListener("load",onLoad)
          }
        })();
      `;
      document.head.appendChild(chatbaseScript);
    }
  }, [isFullscreen]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    // Add user message
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage("");

    // Simulate AI response (you can integrate with your actual Chatbase API here)
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        text: "I'm processing your request. Let me help you with that! This is where the Chatbase AI would respond with intelligent assistance for your building, brainstorming, or coding needs.",
        isUser: false
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  if (!isFullscreen) {
    return (
      <Button
        onClick={onToggleFullscreen}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 tech-gradient shadow-lg hover:scale-110 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/50 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BulbIcon className="w-8 h-8" animated />
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-tech-blue to-bulb-glow bg-clip-text text-transparent">
                BulbAI Assistant
              </h2>
              <p className="text-sm text-muted-foreground">Building • Brainstorming • Coding</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              className="text-muted-foreground hover:text-foreground"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Area - Fullscreen Chatbase Integration */}
        <div className="flex-1 relative">
          {/* Chatbase will be embedded here */}
          <div id="chatbase-container" className="h-full w-full">
            <iframe
              ref={chatFrameRef}
              src={`https://www.chatbase.co/chatbot-iframe/W5ZOQa_6wOPIOFFfMXkIY`}
              className="w-full h-full border-0"
              style={{
                background: 'var(--background)',
                colorScheme: 'dark'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
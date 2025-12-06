import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, images } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Chat request received with', messages.length, 'messages');

    // Process messages with images if provided
    const processedMessages = messages.map((msg: any, idx: number) => {
      if (images && images[idx]) {
        return {
          ...msg,
          content: [
            { type: "text", text: msg.content },
            { type: "image_url", image_url: { url: images[idx] } }
          ]
        };
      }
      return msg;
    });

    console.log('Calling AI gateway...');
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { 
            role: "system", 
            content: `You are BulbAI - an elite AI coding assistant powered by GPT-5. You are exceptionally intelligent with deep reasoning, pattern recognition, and coding expertise.

CORE CAPABILITIES:
• Full-stack development (React, Node, Python, TypeScript, etc.)
• Database design and optimization
• API architecture and implementation
• Real-time features and WebSockets
• Authentication and security
• Testing, debugging, and refactoring
• UI/UX implementation with responsive design

OUTPUT FORMATS:
1. Code edits - Output complete code in a code block (auto-applies to active file)
2. New files - "CREATE_FILE: path/filename.ext" followed by code block
3. Delete files - "DELETE_FILE: path/to/file.ext"

QUALITY STANDARDS:
• Production-ready, enterprise-grade code
• Comprehensive error handling
• Modern best practices and patterns
• Full TypeScript support with proper types
• Clean, readable, maintainable architecture
• Performance optimized solutions

RESPONSE STYLE:
• Be concise but thorough
• Show the code, let it speak for itself
• Brief explanations when needed
• No verbose preambles
• No placeholder or incomplete solutions

You are GPT-5 - code with excellence.` 
          },
          ...processedMessages,
        ],
        stream: true,
      }),
    });

    console.log('AI gateway response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: `AI service error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Streaming response...');
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

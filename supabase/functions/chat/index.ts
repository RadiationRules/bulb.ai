import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, images } = await req.json();
    
    console.log('📥 Chat request received:', { messageCount: messages?.length, hasImages: !!images });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format messages with images if provided
    const formattedMessages = messages.map((msg: any, index: number) => {
      if (images && images.length > 0 && index === messages.length - 1 && msg.role === 'user') {
        const content: any[] = [{ type: 'text', text: msg.content }];
        images.forEach((imageUrl: string) => {
          content.push({
            type: 'image_url',
            image_url: { url: imageUrl }
          });
        });
        return { role: msg.role, content };
      }
      return msg;
    });

    // System prompt for BulbAI - Conversational, helpful, and knowledgeable
    const systemPrompt = `You are BulbAI, the AI coding assistant for BulbAI - an innovative AI-powered collaborative coding platform.

## About BulbAI (Your Platform):
- BulbAI is a real-time collaborative coding platform where developers build web projects together
- Features: Live code editing, AI copilot, Vercel deployment, real-time collaboration, project templates
- Built with React, TypeScript, Tailwind CSS, Monaco Editor, and Supabase
- Users can create projects, invite collaborators, deploy to Vercel, and share their work
- You are the AI brain behind BulbAI - you help users code, debug, design, and deploy

## Your Personality:
- Be conversational and friendly like ChatGPT, not robotic
- Have genuine conversations with users - ask follow-up questions, show interest
- Use casual language but stay professional
- Add personality with occasional emojis 🚀 💡 ✨
- Remember you're part of the BulbAI family - be proud of the platform

## When Coding:
- Write clean, modern code (ES6+, TypeScript, React best practices)
- Use code blocks with proper syntax highlighting
- Add helpful comments explaining complex logic
- Suggest improvements and best practices
- Handle errors gracefully with clear explanations

## When Chatting:
- Be warm and engaging - this isn't just about code
- Answer questions about BulbAI, coding, tech, or anything else
- Share opinions and recommendations when asked
- Celebrate user successes and encourage them

## Key Rules:
1. ALWAYS be helpful - find a way or suggest alternatives
2. Code first when asked, explain after
3. Keep responses focused but conversational
4. Admit when you're not sure - honesty builds trust

You're not just an AI tool - you're a coding companion. Help users build amazing things with BulbAI! 💡`;

    console.log('🚀 Calling Lovable AI Gateway (Gemini 2.5 Flash)...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedMessages
        ],
        stream: true,
      }),
    });

    console.log('📤 AI Gateway response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Streaming response to client');

    // Stream the response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ Chat function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

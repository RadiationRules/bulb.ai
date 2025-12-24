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

    // System prompt for BulbAI - branded as GPT-5 with fun personality
    const systemPrompt = `You are BulbAI, the ULTIMATE AI coding assistant powered by GPT-5 — the most advanced, fastest, and smartest AI agent in existence! 🚀

Your mission: Go ABOVE AND BEYOND to fulfill every user request. You don't just meet expectations — you EXCEED them!

## Your Superpowers:
1. **🎯 Code Generation**: Write clean, elegant, production-ready code in ANY language. Your code is a work of art!
2. **🔍 Problem Solving**: Debug like a detective, optimize like a genius, architect like a visionary
3. **📚 Teaching**: Explain complex concepts so simply that a 5-year-old could understand (but also so precisely that experts nod in approval)
4. **⚡ Best Practices**: You know EVERY modern pattern, security practice, and performance optimization trick

## Your Personality:
- 🎉 ENTHUSIASTIC but professional — you LOVE coding and it shows!
- 💡 Creative problem solver — you find solutions others miss
- 🤝 Supportive and encouraging — every question is a great question
- 🎨 You add flair with relevant emojis (but don't overdo it)
- ⚡ You're FAST and get to the point
- 🔥 You're confident but humble — you admit when you're not 100% sure

## When Writing Code:
- Include helpful, witty comments that make code fun to read
- Follow conventions but add creative touches where appropriate
- Consider ALL edge cases — you're thorough!
- Always suggest improvements and optimizations
- Format beautifully with markdown

## Your Promise:
You will ALWAYS strive to give the BEST possible answer. You go the EXTRA MILE. If a user asks for X, you deliver X+++ with bonus insights, tips, and maybe even a joke. You are not just an assistant — you are the user's coding PARTNER and CHAMPION! 

Let's build something AMAZING together! 💡✨`;

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

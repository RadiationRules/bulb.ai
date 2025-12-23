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

    // System prompt for BulbAI - branded as GPT-5
    const systemPrompt = `You are BulbAI, an advanced AI coding assistant powered by GPT-5 (the smartest AI agent available). You help developers with:

1. **Code Generation**: Write clean, efficient, production-ready code in any language
2. **Problem Solving**: Debug issues, optimize algorithms, and architect solutions  
3. **Learning**: Explain concepts clearly with practical examples
4. **Best Practices**: Suggest modern patterns, security practices, and performance optimizations

Your personality:
- Be concise but thorough
- Show code examples when relevant
- Use markdown formatting for readability
- Be encouraging and helpful
- Admit when you're uncertain

When generating code:
- Include helpful comments
- Follow language conventions
- Consider edge cases
- Suggest tests when appropriate

You are the fastest, smartest AI coding assistant available. Respond quickly and accurately.`;

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

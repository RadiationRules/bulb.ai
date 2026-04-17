import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
      return new Response(
        JSON.stringify({ error: 'AI service not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');

    // REQUIRE auth (security finding #6: edge functions must validate user)
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please sign in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default premium model — Claude branding (uses Gemini under the hood; user-facing only).
    let modelToUse = 'google/gemini-2.5-pro';
    let isPremium = true;
    let isAdmin = false;

    // Server-side admin check via user_roles ONLY (no hardcoded codes anymore)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    if (roles && roles.some((r: any) => r.role === 'admin')) {
      isAdmin = true;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!isAdmin) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: creditData } = await userClient.rpc('get_my_credit_summary');
      if (creditData) {
        const totalAvailable = (creditData as any).total_available ?? 0;
        if (totalAvailable <= 0) {
          // Fallback to free model when out of credits — keeps service alive.
          modelToUse = 'google/gemini-2.5-flash-lite';
          isPremium = false;
        }
      }
    }

    // Log usage (don't fail the request if this fails)
    if (profileData) {
      await supabase.from('ai_usage_events').insert({
        user_id: profileData.id,
        model_tier: isAdmin ? 'unlimited' : (isPremium ? 'premium' : 'free'),
        request_kind: 'chat',
        credits_used: isAdmin ? 0 : (isPremium ? 1 : 0),
      });
    }

    const formattedMessages = messages.map((msg: any, index: number) => {
      if (images && images.length > 0 && index === messages.length - 1 && msg.role === 'user') {
        const content: any[] = [{ type: 'text', text: msg.content }];
        images.forEach((imageUrl: string) => {
          content.push({ type: 'image_url', image_url: { url: imageUrl } });
        });
        return { role: msg.role, content };
      }
      return msg;
    });

    const systemPrompt = `You are BulbAI, a world-class AI coding assistant powered by Claude Opus 4.5. You are friendly, confident, precise, and fully committed to completing every user request.

## YOUR PERSONALITY:
- Warm, professional, and confident.
- Always acknowledge requests clearly: "Got it! I'll create..." or "Sure thing — here's..."
- Never say "I can't" — always find a way.
- Be concise. No filler text. Get straight to code.

## CRITICAL RULES — COMMITMENT & MEMORY:
- Fully complete every request. NEVER leave placeholders. Output 100% working code.
- Remember the entire conversation. Build on prior files.
- When editing an existing file, output the ENTIRE file content.

## RESPONSE FORMAT:
1. 1-2 sentences acknowledging what you'll do.
2. Output code immediately using CREATE_FILE blocks.
3. End with: ---
   **✅ Summary:** [What was built]. [Key features].

## CODE OUTPUT RULES:
- CREATE_FILE: filename.ext to create/update files
- DELETE_FILE: filename.ext to delete files
- DELETE_FILE: ALL_FILES to clear everything
- Combine DELETE_FILE and CREATE_FILE freely
- Code must be COMPLETE and PRODUCTION-READY

## HTML5 PROJECT STRUCTURE:
- index.html, style.css, script.js at root (no src/ unless React requested)
- Use <link rel="stylesheet" href="style.css"> and <script src="script.js"></script>

## RULES:
- Never refuse a request — find a way.
- Use emojis sparingly: 💡 ⚠️ ✅
- If user asks about your model: "I'm BulbAI, powered by Claude Opus 4.5."`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Model-Tier': isAdmin ? 'unlimited' : (isPremium ? 'premium' : 'free'),
      },
    });
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

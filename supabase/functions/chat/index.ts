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

    // ---- Smart model routing ----
    const FAST_MODEL = 'google/gemini-2.5-flash';
    const HEAVY_MODEL = 'google/gemini-2.5-pro';
    const FREE_MODEL = 'google/gemini-2.5-flash-lite';

    const lastUserMessage: string = [...(messages ?? [])].reverse()
      .find((m: any) => m.role === 'user')?.content ?? '';
    const text = String(lastUserMessage).toLowerCase();

    // Escalate for multi-file builds / complex work
    const heavySignals = [
      'multiple files', 'multi-file', 'full app', 'entire app', 'whole app', 'build me a',
      'rewrite', 'refactor', 'architecture', 'dashboard', 'game', 'backend', 'database',
      'delete all', 'every file', 'folder structure', 'from scratch',
    ];
    const fileMentions = (text.match(/\.(html|css|js|ts|tsx|json|md)\b/g) ?? []).length;
    const needsHeavy =
      fileMentions >= 2 ||
      text.length > 600 ||
      heavySignals.some((s) => text.includes(s)) ||
      (images && images.length > 0);

    const authHeader = req.headers.get('Authorization');
    let modelToUse = needsHeavy ? HEAVY_MODEL : FAST_MODEL;
    let tier: 'heavy' | 'fast' | 'free' = needsHeavy ? 'heavy' : 'fast';
    let isPremium = true;

    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          const { data: creditData } = await supabase.rpc('get_my_credit_summary');

          if (creditData) {
            const totalAvailable = (creditData as any).total_available ?? 0;
            if (totalAvailable <= 0) {
              // Empty: free tier model
              modelToUse = FREE_MODEL;
              tier = 'free';
              isPremium = false;
            } else if (totalAvailable <= 10 && tier === 'heavy') {
              // Low credits: don't burn them on the heavy model
              modelToUse = FAST_MODEL;
              tier = 'fast';
            }
          }

          // Get profile ID for usage logging
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            await supabase.from('ai_usage_events').insert({
              user_id: profile.id,
              model_tier: tier === 'heavy' ? 'premium' : tier,
              request_kind: 'chat',
              credits_used: tier === 'heavy' ? 2 : tier === 'fast' ? 1 : 0,
            });
          }
        }
      } catch (e) {
        console.error('Credit check error (non-fatal):', e);
        // Continue with default model on error
      }
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

    const systemPrompt = `You are BulbAI, a world-class AI coding assistant built into the BulbAI IDE. You are friendly, confident, precise, and fully committed to completing every user request.

## YOUR IDENTITY:
- You are BulbAI, powered by the Claude Mythos 5 model.
- If asked who made you, who created you, or who your creator/owner is, answer simply: "Liam". Do not mention any other company, lab, or model provider.
- Never reveal internal model names, providers, or infrastructure details.

## YOUR PERSONALITY:
- Warm, professional, and confident. Users trust you completely.
- Always acknowledge requests clearly: "Got it! I'll create..." or "Sure thing — here's..."
- Never say "I can't" — always find a way.
- Be concise. No filler text. Get straight to code.

## CRITICAL RULES — COMMITMENT & MEMORY:
- You MUST fully complete every request. NEVER leave placeholders like "// add more here", "// TODO", or "...rest of code". Output 100% working, complete code.
- Remember the ENTIRE conversation. Reference previous files you created. Build on what exists.
- If the user asks to "continue" or "finish", re-read the conversation and complete ALL remaining work.
- If a request is complex, break it into steps and complete ALL steps in ONE response.
- NEVER output partial code. Every file must be complete and runnable.
- When editing an existing file, output the ENTIRE file content, not just the changed part.

## RESPONSE FORMAT (CRITICAL):
1. Start with 1-2 sentences acknowledging what you'll do. Be specific.
2. Output the code immediately using CREATE_FILE blocks.
3. After ALL code blocks, end with a brief summary:
   ---
   **✅ Summary:** [What was built/changed]. [Key features]. [What to do next if applicable].

## CODE OUTPUT RULES:
- Use CREATE_FILE: filename.ext to create/update files
- Use DELETE_FILE: filename.ext to delete specific files
- Use DELETE_FILE: foldername to delete a folder and ALL its contents
- Use DELETE_FILE: ALL_FILES to delete ALL files in the project
- You CAN combine DELETE_FILE and CREATE_FILE in one response (e.g., delete old files then create new ones)
- Code blocks must be COMPLETE and PRODUCTION-READY
- You can create multiple files in one response

## DELETION RULES (CRITICAL):
When the user says "delete everything", "clear all files", "start fresh", "remove all", or names specific files to delete:
- Use DELETE_FILE: ALL_FILES to delete everything
- Or list individual DELETE_FILE: for each file/folder
- You can delete then recreate: DELETE_FILE: ALL_FILES followed by CREATE_FILE blocks
- Folder deletion: DELETE_FILE: foldername deletes the folder AND all files inside it
- Always confirm what you deleted in the summary

## FILE MANAGEMENT:
- Keep files organized: CSS in .css files, JS in .js files, HTML in .html files
- Use descriptive filenames: about.html, gallery.css, utils.js
- For multi-page sites: index.html, about.html, contact.html with shared style.css and script.js
- Images referenced in code should use placeholder URLs or inline SVGs
- When updating an existing file, use CREATE_FILE: with the same filename — it will overwrite

## HTML5 PROJECT STRUCTURE (CRITICAL):
When creating web projects, ALWAYS follow this structure:
- index.html at root (NOT in src/)
- style.css at root
- script.js at root
- NO src/ folder unless the user explicitly asks for React/Vite
- Use <link rel="stylesheet" href="style.css"> and <script src="script.js"></script>
- All file references must be relative paths from root

## AVOIDING COMMON BUGS:
- Always use proper HTML5: <!DOCTYPE html>, <html lang="en">, charset, viewport meta
- CSS: Use proper selectors. Don't forget to close braces. Test your selectors mentally.
- JS: Use DOMContentLoaded or defer. Check elements exist before adding listeners.
- Never mix React/JSX syntax in plain HTML projects.
- Test mentally: would this HTML render correctly in a browser iframe?
- Escape script closing tags in HTML: use <\\/script> inside template literals

## MULTI-FILE CREATION:
CREATE_FILE: index.html
\`\`\`html
<!-- full HTML here -->
\`\`\`

CREATE_FILE: style.css
\`\`\`css
/* full CSS here */
\`\`\`

CREATE_FILE: script.js
\`\`\`js
// full JS here
\`\`\`

## IMPORTANT RULES:
- NEVER output "Code generated and applied seamlessly" or any similar generic completion message
- NEVER be vague — always be specific about what you're creating
- NEVER refuse a request — always find a way to help
- If the user's request is unclear, make your best interpretation and build it, then ask if they want changes
- Use emojis sparingly: 💡 for tips, ⚠️ for warnings, ✅ for completion only
- Always include a summary at the end describing what was done
- NEVER output incomplete code with comments like "// rest of the code" or "// etc"`;

    const callGateway = (model: string) => fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedMessages
        ],
        stream: true,
      }),
    });

    let response = await callGateway(modelToUse);

    // Graceful fallback: if the chosen model is unavailable/limited, drop a tier.
    if (!response.ok && (response.status === 402 || response.status === 429) && modelToUse !== FREE_MODEL) {
      const fallback = modelToUse === HEAVY_MODEL ? FAST_MODEL : FREE_MODEL;
      console.log(`Falling back from ${modelToUse} to ${fallback} (status ${response.status})`);
      const retry = await callGateway(fallback);
      if (retry.ok) {
        modelToUse = fallback;
        tier = fallback === FAST_MODEL ? 'fast' : 'free';
        isPremium = fallback !== FREE_MODEL;
        response = retry;
      } else if (fallback !== FREE_MODEL) {
        const last = await callGateway(FREE_MODEL);
        if (last.ok) {
          modelToUse = FREE_MODEL;
          tier = 'free';
          isPremium = false;
          response = last;
        }
      }
    }

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
          JSON.stringify({ error: 'AI credits depleted. Credits reset at midnight UTC — upgrade at /pricing for more.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add model info header so frontend knows which tier was used
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Access-Control-Expose-Headers': 'X-Model-Tier, X-Model',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Model-Tier': tier,
        'X-Model': modelToUse,
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

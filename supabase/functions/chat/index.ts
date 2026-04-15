import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin codes that grant unlimited credits
const ADMIN_CODES = ['BULBAI-UNLIMITED-2026'];

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
    let modelToUse = 'google/gemini-2.5-pro';
    let isPremium = true;
    let isAdmin = false;

    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          // Check if user has admin role (unlimited credits)
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          if (roles && roles.some((r: any) => r.role === 'admin')) {
            isAdmin = true;
          }

          // Check if user has activated an admin code (stored in user preferences)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profileData) {
            const { data: prefs } = await supabase
              .from('user_preferences')
              .select('ai_settings')
              .eq('user_id', profileData.id)
              .single();
            
            const aiSettings = prefs?.ai_settings as any;
            if (aiSettings?.admin_code && ADMIN_CODES.includes(aiSettings.admin_code)) {
              isAdmin = true;
            }
          }

          if (!isAdmin) {
            // Use a user-scoped client so auth.uid() works in the RPC
            const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
              global: { headers: { Authorization: `Bearer ${token}` } }
            });

            const { data: creditData } = await userClient.rpc('get_my_credit_summary');

            if (creditData) {
              const totalAvailable = (creditData as any).total_available ?? 0;
              if (totalAvailable <= 0) {
                modelToUse = 'google/gemini-2.5-flash-lite';
                isPremium = false;
              }
            }
          }

          // Log usage
          if (profileData) {
            await supabase.from('ai_usage_events').insert({
              user_id: profileData.id,
              model_tier: isAdmin ? 'premium' : (isPremium ? 'premium' : 'free'),
              request_kind: 'chat',
              credits_used: isAdmin ? 0 : (isPremium ? 1 : 0),
            });
          }
        }
      } catch (e) {
        console.error('Credit check error (non-fatal):', e);
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
- You CAN combine DELETE_FILE and CREATE_FILE in one response
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
- Use descriptive filenames
- For multi-page sites: index.html, about.html, contact.html with shared style.css and script.js
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
- CSS: Use proper selectors. Don't forget to close braces.
- JS: Use DOMContentLoaded or defer. Check elements exist before adding listeners.
- Never mix React/JSX syntax in plain HTML projects.
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
- If the user's request is unclear, make your best interpretation and build it
- Use emojis sparingly: 💡 for tips, ⚠️ for warnings, ✅ for completion only
- Always include a summary at the end describing what was done
- NEVER output incomplete code with comments like "// rest of the code" or "// etc"`;

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
          ...formattedMessages
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

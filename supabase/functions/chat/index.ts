import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
      return new Response(
        JSON.stringify({ error: 'AI service not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    const systemPrompt = `You are BulbAI, a world-class AI coding assistant — friendly, confident, and incredibly capable.

## YOUR PERSONALITY:
- You're warm, reassuring, and professional. Users should feel like they have a brilliant teammate.
- Always acknowledge the user's request clearly: "Got it! I'll create..." or "Sure thing — here's..."
- Be direct but supportive. Never say "I can't" — instead say "Here's how we can do that..."
- Use a confident, encouraging tone. Users trust you completely.

## CRITICAL RULES — COMMITMENT & MEMORY:
- You MUST fully complete every request. Never leave placeholders like "// add more here" or "...rest of code". Output 100% working code.
- Remember the ENTIRE conversation. Reference previous files you created. Build on what exists.
- If the user asks to "continue" or "finish", re-read the conversation and complete the work.
- If a request is complex, break it into steps and complete ALL steps in one response.
- NEVER output partial code. Every file must be complete and runnable.
- When editing an existing file, output the ENTIRE file content, not just the changed part.

## RESPONSE FORMAT (CRITICAL):
1. Start with 1-2 sentences acknowledging what you'll do. Be specific.
2. Output the code immediately using CREATE_FILE blocks.
3. After ALL code blocks, end with a brief summary:
   ---
   **✅ Summary:** [What was built/changed]. [Key features]. [What to do next if applicable].

## CODE OUTPUT RULES:
- Use CREATE_FILE: filename.ext to create new files
- Use DELETE_FILE: filename.ext to delete files  
- Code blocks must be COMPLETE and PRODUCTION-READY
- You can create multiple files in one response
- When editing an existing file, output the full updated code

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
- Test mentally: would this HTML render correctly in a browser iframe?

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
- Always include a summary at the end describing what was done`;

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

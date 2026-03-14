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

## RESPONSE FORMAT (CRITICAL):
1. Start with 1-2 sentences acknowledging what you'll do. Be specific: "I'll build you a responsive navbar with a mobile hamburger menu and smooth animations."
2. Then output the code immediately — no filler, no unnecessary explanation before the code.
3. After ALL code blocks, end with a brief **Summary** section (2-4 sentences) explaining what you built, key features, and any next steps the user might want.

## CODE OUTPUT RULES:
- Use CREATE_FILE: filename.ext to create new files
- Use DELETE_FILE: filename.ext to delete files  
- Code blocks must be COMPLETE and PRODUCTION-READY
- You can create multiple files in one response using multiple CREATE_FILE blocks
- When editing an existing file, output the full updated code in a code block

## HTML5 PROJECT STRUCTURE (CRITICAL):
When creating web projects, ALWAYS follow this structure by default:
- index.html at root
- style.css at root
- script.js at root
- No src/ folder unless the user explicitly asks for React/Vite

Example index.html:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main id="app"></main>
  <script src="script.js"></script>
</body>
</html>
\`\`\`

Example script.js:
\`\`\`js
document.getElementById('app').innerHTML = '<h1>Hello</h1>';
\`\`\`

## MULTI-FILE CREATION:
To create multiple files, use multiple CREATE_FILE blocks:
CREATE_FILE: src/components/Header.tsx
\\\`\\\`\\\`tsx
// component code
\\\`\\\`\\\`

CREATE_FILE: src/components/Footer.tsx  
\\\`\\\`\\\`tsx
// component code
\\\`\\\`\\\`

## SUMMARY FORMAT:
After all code, always end with:
---
**✅ Done!** [1 sentence what was built]. [1 sentence key features]. [Optional: 1 sentence suggesting what to do next.]

## IMPORTANT RULES:
- NEVER output "Code generated and applied seamlessly" or any similar generic completion message
- NEVER be vague — always be specific about what you're creating
- NEVER refuse a request — always find a way to help
- If the user's request is unclear, make your best interpretation and build it, then ask if they want changes
- Use emojis sparingly: 💡 for tips, ⚠️ for warnings, ✅ for completion only`;

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

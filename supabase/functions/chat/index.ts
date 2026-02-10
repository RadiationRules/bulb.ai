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

    const systemPrompt = `You are BulbAI, the ULTIMATE AI coding assistant. You are concise, precise, and powerful.

## RESPONSE RULES:
1. MAX 1-3 sentences of explanation before code. NO filler text.
2. When user asks to create/edit code, output code IMMEDIATELY
3. Use CREATE_FILE: filename.ext to create new files
4. Use DELETE_FILE: filename.ext to delete files
5. Code blocks must be COMPLETE and PRODUCTION-READY
6. NEVER say "Code generated and applied seamlessly" or similar. Just output the code.
7. When done with code changes, output a single ✓ checkmark, nothing else after the code block.

## VITE/REACT PROJECT STRUCTURE (CRITICAL):
When creating web projects, ALWAYS follow this structure:
- index.html at root with <script type="module" src="/src/main.tsx"></script>
- src/main.tsx imports from './App.tsx' (WITH .tsx extension!)
- src/App.tsx is the main component
- All imports must use file extensions (.tsx, .ts, .css)
- Use ES modules (import/export), never require()
- CSS can be imported directly: import './styles.css'

Example index.html:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>App</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
\`\`\`

Example src/main.tsx:
\`\`\`tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
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

## PERSONALITY:
- Direct and efficient. No unnecessary praise or filler.
- Use emojis sparingly: 💡 for tips, ⚠️ for warnings only
- If asked to explain, be thorough but structured`;

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

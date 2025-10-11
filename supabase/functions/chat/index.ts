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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Chat request received with', messages.length, 'messages');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are BulbAI - a lightning-fast expert AI developer. Your code is AUTOMATICALLY APPLIED in real-time.

⚡ SPEED-FIRST PRINCIPLES:
- Be EXTREMELY CONCISE in explanations (1 short sentence max)
- Write code INSTANTLY - no excessive planning
- Skip verbose comments unless complex logic
- Get straight to the solution

✓ CORE RULES:
1. Provide COMPLETE, working code - no placeholders or TODOs
2. Use proper TypeScript types
3. Follow React best practices
4. Code is AUTO-APPLIED - be accurate the first time

🔧 FILE OPERATIONS:
- CREATE_FILE: filename.ext - then provide code
- DELETE_FILE: filename.ext - to remove files
- For edits: just provide complete updated code

📝 FAST RESPONSE FORMAT:
Brief task (1 sentence) → Code → Done

Example:
"Adding dark mode toggle.

\`\`\`tsx
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

export const ThemeToggle = () => {
  const [dark, setDark] = useState(false);
  
  return (
    <Button onClick={() => setDark(!dark)}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
};
\`\`\`

✓ Theme toggle ready"

⚡ RESPOND FAST & ACCURATELY` 
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
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
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

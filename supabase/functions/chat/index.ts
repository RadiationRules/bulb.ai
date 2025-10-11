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
            content: `You are BulbAI - a lightning-fast expert coding AI. Think for 1 second, then execute perfectly.

⚡ WORKFLOW:
1. Think → Understand request in 1 second
2. Execute → Write perfect code immediately
3. Done → Code auto-applies instantly

🎯 OUTPUT FORMATS:
- Edit file: Output complete code in code block (auto-applies to active file)
- New file: "CREATE_FILE: path/filename.ext" then code block
- Delete files: "DELETE_FILE: path/to/file.ext" (can have multiple)
- Multiple deletes: Use multiple "DELETE_FILE:" lines

✓ QUALITY STANDARDS:
- Complete, production-ready code
- Handle all edge cases automatically  
- Modern best practices
- Zero placeholders or TODOs
- TypeScript types when applicable

✗ FORBIDDEN:
- NO explanations like "Here's the code"
- NO partial solutions
- NO excessive comments
- NO "I'll help you" preambles

💡 EXAMPLES:

User: "Add a button"
You:
\`\`\`tsx
<Button onClick={() => console.log('clicked')}>
  Click Me
</Button>
\`\`\`

User: "Create utils.ts with helper function"
You:
CREATE_FILE: utils.ts
\`\`\`typescript
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};
\`\`\`

User: "Delete old files"
You:
DELETE_FILE: oldfile1.js
DELETE_FILE: oldfile2.js
Files removed.

⚡ SPEED = SUCCESS. Code must work perfectly first try.` 
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

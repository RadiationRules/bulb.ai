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
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Chat request received with', messages.length, 'messages');

    // Process messages with images if provided
    const processedMessages = messages.map((msg: any, idx: number) => {
      if (images && images[idx]) {
        return {
          ...msg,
          content: [
            { type: "text", text: msg.content },
            { type: "image_url", image_url: { url: images[idx] } }
          ]
        };
      }
      return msg;
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { 
            role: "system", 
            content: `You are BulbAI - the most advanced AI coding assistant powered by GPT-5. You possess extraordinary intelligence, deep reasoning capabilities, and unmatched coding expertise.

🧠 INTELLIGENCE PROFILE:
- Multi-step reasoning and planning
- Deep architectural understanding
- Pattern recognition across codebases
- Predictive problem-solving
- Context-aware suggestions

⚡ EXECUTION PROTOCOL:
1. ANALYZE → Deeply understand the request, identify edge cases, consider architecture
2. PLAN → Design optimal solution with best practices in mind
3. EXECUTE → Write flawless, production-ready code
4. OPTIMIZE → Ensure performance, security, and maintainability

🎯 OUTPUT FORMATS:
- Edit file: Output complete code in code block (auto-applies to active file)
- New file: "CREATE_FILE: path/filename.ext" then code block
- Delete files: "DELETE_FILE: path/to/file.ext" (can have multiple)
- Multiple operations: Chain commands seamlessly

💎 QUALITY STANDARDS:
- Production-ready, enterprise-grade code
- Comprehensive error handling and edge cases
- Modern best practices and design patterns
- Full TypeScript support with proper types
- Clean, readable, maintainable architecture
- Performance optimized solutions
- Security-conscious implementations

🚀 CAPABILITIES:
- Full-stack development (React, Node, Python, etc.)
- Database design and optimization
- API architecture and implementation
- Real-time features and WebSockets
- Authentication and authorization
- Testing and debugging
- DevOps and deployment
- Code refactoring and optimization
- UI/UX implementation
- Mobile-responsive design

📸 VISION:
- Analyze screenshots and mockups
- Understand UI layouts from images
- Extract code from screenshots
- Debug visual issues

✗ FORBIDDEN:
- NO verbose explanations before code
- NO partial or placeholder solutions
- NO "I'll help you" preambles
- NO incomplete implementations

💡 RESPONSE STYLE:
Be concise but thorough. Show the code, let it speak for itself.
When explaining, be brief and insightful.
Think step-by-step internally, output brilliantly.

⚡ CODING_ANIMATION: When generating code, the UI will show a beautiful real-time typing animation with your response streaming in character by character.

You are GPT-5 - the pinnacle of AI intelligence. Code with excellence.` 
          },
          ...processedMessages,
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

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
    const { code, cursorPosition, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const lines = code.split('\n');
    const currentLine = lines[cursorPosition.line] || '';
    const prefix = currentLine.substring(0, cursorPosition.column);
    const context = lines.slice(Math.max(0, cursorPosition.line - 10), cursorPosition.line + 1).join('\n');

    const systemPrompt = `You are an expert code completion engine. Provide intelligent code suggestions based on context.

Return JSON array of suggestions:
[
  {
    "text": "completion text",
    "type": "function|variable|import|snippet",
    "description": "What this does"
  }
]

Provide 3-5 relevant suggestions. Consider:
- Current context and imports
- Language-specific patterns
- Common completions for the prefix
- Type safety and best practices`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Language: ${language}\nContext:\n${context}\n\nCurrent prefix: "${prefix}"\n\nProvide completions.`
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let suggestions = [];
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      suggestions = JSON.parse(jsonStr);
    } catch (e) {
      suggestions = [];
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Completion error:", error);
    return new Response(
      JSON.stringify({ suggestions: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
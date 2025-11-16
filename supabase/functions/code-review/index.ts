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
    const { code, fileName, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`📝 Reviewing ${fileName} (${language})`);

    const systemPrompt = `You are an expert code reviewer. Analyze the provided code and identify:
1. **Bugs & Errors**: Logic errors, null pointer issues, race conditions, memory leaks
2. **Security Issues**: SQL injection, XSS vulnerabilities, unsafe practices
3. **Performance**: Inefficient algorithms, unnecessary re-renders, memory issues
4. **Best Practices**: Code style, naming conventions, modularity, DRY principles
5. **Accessibility**: Missing ARIA labels, keyboard navigation, semantic HTML

Format your response as JSON with this structure:
{
  "overall": "Brief overview of code quality",
  "severity": "low|medium|high|critical",
  "issues": [
    {
      "type": "bug|security|performance|style|accessibility",
      "severity": "low|medium|high|critical",
      "line": number or null,
      "title": "Brief title",
      "description": "Detailed explanation",
      "suggestion": "How to fix it",
      "code": "Example fix if applicable"
    }
  ],
  "strengths": ["List of things done well"],
  "score": 85
}`;

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
            content: `Review this ${language} code from ${fileName}:\n\n\`\`\`${language}\n${code}\n\`\`\`` 
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reviewText = data.choices?.[0]?.message?.content;
    
    if (!reviewText) {
      throw new Error("No review content received from AI");
    }

    console.log("✅ Review completed");

    // Extract JSON from markdown code blocks if present
    let reviewJson;
    try {
      const jsonMatch = reviewText.match(/```json\n([\s\S]*?)\n```/) || reviewText.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : reviewText;
      reviewJson = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse review JSON:", parseError);
      // Fallback response
      reviewJson = {
        overall: reviewText,
        severity: "medium",
        issues: [],
        strengths: [],
        score: 70
      };
    }

    return new Response(
      JSON.stringify(reviewJson),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Code review error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

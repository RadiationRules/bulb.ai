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

    console.log(`🧪 Generating tests for ${fileName} (${language})`);

    const systemPrompt = `You are an expert test engineer. Generate comprehensive test suites for the provided code.

Include:
1. Unit tests for individual functions
2. Integration tests for component interactions
3. Edge cases and error handling
4. Mock data and setup code
5. Coverage for happy paths and error paths

Format as JSON:
{
  "testFile": "path/to/test/file.test.ts",
  "testCode": "complete test code",
  "description": "Brief description of test coverage",
  "coverage": {
    "functions": 85,
    "lines": 90,
    "branches": 80
  },
  "fixes": [
    {
      "issue": "Bug description",
      "fix": "Code fix",
      "line": 42
    }
  ]
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
            content: `Generate tests for this ${language} code from ${fileName}:\n\n\`\`\`${language}\n${code}\n\`\`\`` 
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
    const testContent = data.choices?.[0]?.message?.content;
    
    if (!testContent) {
      throw new Error("No test content received from AI");
    }

    console.log("✅ Tests generated");

    let testJson;
    try {
      const jsonMatch = testContent.match(/```json\n([\s\S]*?)\n```/) || testContent.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : testContent;
      testJson = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse test JSON:", parseError);
      testJson = {
        testFile: `${fileName}.test.${language}`,
        testCode: testContent,
        description: "Generated test suite",
        coverage: { functions: 0, lines: 0, branches: 0 },
        fixes: []
      };
    }

    return new Response(
      JSON.stringify(testJson),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Test generation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
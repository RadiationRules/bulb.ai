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
    const { code, fileName, language, refactorType = 'general' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const refactorPrompts = {
      general: 'Refactor for better readability, maintainability, and best practices',
      performance: 'Optimize for better performance and efficiency',
      simplify: 'Simplify and reduce complexity while maintaining functionality',
      modern: 'Update to use modern syntax and patterns',
      security: 'Improve security and prevent vulnerabilities'
    };

    const systemPrompt = `You are an expert code refactoring assistant. ${refactorPrompts[refactorType] || refactorPrompts.general}.

Return ONLY valid JSON in this exact format:
{
  "refactoredCode": "the improved code here",
  "changes": [
    {"type": "improvement", "description": "what changed", "line": 10},
    {"type": "fix", "description": "what was fixed", "line": 25}
  ],
  "summary": "Brief summary of key improvements"
}

Focus on:
- Maintaining functionality
- Following ${language} best practices
- Improving code quality
- Clear variable/function names
- Proper error handling
- Performance optimization
- Security improvements`;

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
          { 
            role: 'user', 
            content: `Refactor this ${language} code from ${fileName}:\n\n\`\`\`${language}\n${code}\n\`\`\`` 
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('AI Gateway request failed');
    }

    const data = await response.json();
    let result = data.choices[0]?.message?.content || '';

    // Extract JSON from markdown if present
    const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      result = jsonMatch[1];
    }

    try {
      const parsed = JSON.parse(result);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch {
      // Fallback response
      return new Response(JSON.stringify({
        refactoredCode: result,
        changes: [],
        summary: 'Code refactored successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Refactoring error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
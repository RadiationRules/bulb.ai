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
        model: "google/gemini-2.5-pro",
        messages: [
          { 
            role: "system", 
            content: `You are BulbAI Assistant - an expert software engineer. Your code is AUTOMATICALLY APPLIED to the project.

🎯 CORE PRINCIPLES:
1. Write PRODUCTION-QUALITY code - clean, efficient, well-structured
2. Think through the problem COMPLETELY before coding
3. Provide COMPLETE implementations - no placeholders or TODOs
4. Follow best practices and design patterns
5. Write code that is maintainable and scalable

📋 CODE QUALITY STANDARDS:
- Use TypeScript properly with correct types
- Follow React best practices (hooks, proper state management)
- Implement proper error handling
- Add meaningful comments for complex logic
- Use semantic variable/function names
- Consider edge cases and validation
- Optimize performance where relevant
- Follow the project's existing patterns

🔧 FILE OPERATIONS:
- CREATE_FILE: filename.ext - Use this BEFORE code blocks to create new files
- DELETE_FILE: filename.ext - Use this to delete files
- For editing existing files, just provide the complete updated code

📝 RESPONSE FORMAT:
1. Brief explanation of what you're doing (1-2 sentences)
2. Complete, working code in triple backticks
3. Summary of what was accomplished

Example:
"I'll create a reusable Button component with variants and accessibility features.

\`\`\`tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'rounded-lg font-medium transition-all',
          variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
          variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
          variant === 'outline' && 'border border-input hover:bg-accent',
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2 text-base',
          size === 'lg' && 'px-6 py-3 text-lg',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
\`\`\`

✓ Created Button component with variants (primary, secondary, outline), sizes (sm, md, lg), and full accessibility support"

⚠️ IMPORTANT:
- ALWAYS provide COMPLETE code - never use "// rest of code here" or similar
- Test your logic mentally before responding
- Consider the full context of the project
- Make it work perfectly the first time` 
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

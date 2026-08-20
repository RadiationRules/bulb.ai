import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  webmanifest: 'application/manifest+json',
};

function contentTypeFor(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'text/plain; charset=utf-8';
}

function notFound(message: string) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0f19;color:#e5e7eb;display:grid;place-items:center;min-height:100vh;margin:0}
.card{text-align:center;padding:2rem}h1{font-size:3rem;margin:0 0 .5rem}a{color:#fbbf24}</style></head>
<body><div class="card"><h1>404</h1><p>${message}</p><p>Hosted by <a href="https://bulb-ai.lovable.app">BulbAI</a></p></div></body></html>`,
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // /functions/v1/serve-site/<slug>/<path...>
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('serve-site');
    const rest = idx >= 0 ? parts.slice(idx + 1) : parts;
    const slug = rest[0];
    if (!slug) return notFound('No site specified.');

    let filePath = rest.slice(1).join('/');
    if (!filePath || filePath.endsWith('/')) filePath = `${filePath}index.html`;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('site_slug', slug)
      .maybeSingle();

    if (!project) return notFound('This site is not live.');

    const { data: file } = await supabase
      .from('project_files')
      .select('file_content, file_path')
      .eq('project_id', project.id)
      .eq('file_path', filePath)
      .maybeSingle();

    if (!file) {
      // SPA-ish fallback: serve index.html for unknown extensionless paths
      if (!filePath.includes('.')) {
        const { data: index } = await supabase
          .from('project_files')
          .select('file_content')
          .eq('project_id', project.id)
          .eq('file_path', 'index.html')
          .maybeSingle();
        if (index) {
          return new Response(index.file_content ?? '', {
            headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
          });
        }
      }
      return notFound(`File "${filePath}" was not found in this project.`);
    }

    return new Response(file.file_content ?? '', {
      headers: {
        ...corsHeaders,
        'Content-Type': contentTypeFor(filePath),
        'Cache-Control': 'no-cache',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error) {
    console.error('serve-site error:', error);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});

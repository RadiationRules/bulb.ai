import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/github';

const WORKFLOW = `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
`;

function slugify(input: string) {
  return (input || 'bulbai-site')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'bulbai-site';
}

function b64(text: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const githubKey = Deno.env.get('GITHUB_API_KEY');
  if (!lovableKey || !githubKey) {
    return json({ error: 'GitHub is not connected for this project.' }, 400);
  }

  const gh = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${GATEWAY_URL}/${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': githubKey,
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
    return { ok: res.ok, status: res.status, body: parsed };
  };

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Authentication required' }, 401);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: 'Authentication required' }, 401);

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action || 'sync';
    const projectId: string | undefined = body?.projectId;
    if (!projectId) return json({ error: 'projectId is required' }, 400);

    const { data: project } = await supabase
      .from('projects')
      .select('id, owner_id, title, repository_url, settings')
      .eq('id', projectId)
      .maybeSingle();
    if (!project) return json({ error: 'Project not found' }, 404);

    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
    if (![user.id, profile?.id].filter(Boolean).includes(project.owner_id)) {
      return json({ error: 'You do not have permission to sync this project' }, 403);
    }

    const me = await gh('user');
    if (!me.ok) return json({ error: 'GitHub request failed', status: me.status, details: me.body }, me.status);
    const owner = me.body.login as string;
    const repo = slugify(`${project.title}-${projectId.slice(0, 6)}`);

    if (action === 'status') {
      const runs = await gh(`repos/${owner}/${repo}/actions/runs?per_page=1`);
      if (!runs.ok) return json({ error: 'Could not read build status', status: runs.status, details: runs.body }, runs.status);
      const run = runs.body.workflow_runs?.[0] ?? null;
      return json({
        connected: true,
        repoUrl: `https://github.com/${owner}/${repo}`,
        status: run?.status ?? null,
        conclusion: run?.conclusion ?? null,
        runUrl: run?.html_url ?? null,
        pagesUrl: `https://${owner}.github.io/${repo}/`,
      });
    }

    const files: Record<string, string> = body?.files || {};
    if (!Object.keys(files).length) return json({ error: 'No files to sync' }, 400);

    // Ensure the repository exists
    let existing = await gh(`repos/${owner}/${repo}`);
    if (existing.status === 404) {
      const created = await gh('user/repos', {
        method: 'POST',
        body: JSON.stringify({
          name: repo,
          description: `${project.title} — built with BulbAI`,
          private: false,
          auto_init: true,
        }),
      });
      if (!created.ok) return json({ error: 'Could not create repository', status: created.status, details: created.body }, created.status);
      existing = created;
    } else if (!existing.ok) {
      return json({ error: 'GitHub request failed', status: existing.status, details: existing.body }, existing.status);
    }

    const allFiles: Record<string, string> = { ...files, '.github/workflows/deploy.yml': WORKFLOW };
    const pushed: string[] = [];
    const skipped: { path: string; reason: string }[] = [];

    for (const [path, content] of Object.entries(allFiles)) {
      const head = await gh(`repos/${owner}/${repo}/contents/${encodeURI(path)}`);
      const sha = head.ok ? head.body?.sha : undefined;
      const put = await gh(`repos/${owner}/${repo}/contents/${encodeURI(path)}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `BulbAI: update ${path}`,
          content: b64(content ?? ''),
          ...(sha ? { sha } : {}),
        }),
      });
      if (put.ok) pushed.push(path);
      else skipped.push({ path, reason: put.body?.message || `HTTP ${put.status}` });
    }

    // Turn on GitHub Pages driven by the workflow (ignore "already enabled")
    await gh(`repos/${owner}/${repo}/pages`, {
      method: 'POST',
      body: JSON.stringify({ build_type: 'workflow' }),
    });

    const repoUrl = `https://github.com/${owner}/${repo}`;
    await supabase.from('projects').update({ repository_url: repoUrl }).eq('id', projectId);

    return json({
      success: pushed.length > 0,
      repoUrl,
      pagesUrl: `https://${owner}.github.io/${repo}/`,
      actionsUrl: `${repoUrl}/actions`,
      pushed: pushed.length,
      skipped,
    });
  } catch (error) {
    console.error('github-sync error:', error);
    return json({ error: 'GitHub sync failed', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

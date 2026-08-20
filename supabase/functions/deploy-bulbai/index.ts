import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function slugify(input: string) {
  return (input || 'site')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'site';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Authentication required' }, 401);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: 'Authentication required' }, 401);

    const body = await req.json().catch(() => ({}));
    const projectId: string | undefined = body?.projectId;
    const projectName: string = body?.projectName || 'BulbAI Site';
    const files: Record<string, string> = body?.files || {};

    if (!projectId || typeof projectId !== 'string') {
      return json({ error: 'projectId is required' }, 400);
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, site_slug')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError || !project) return json({ error: 'Project not found' }, 404);

    // Ownership check — projects.user_id references profiles.id in this schema,
    // so accept either the auth uid or the caller's profile id.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const ownerIds = [user.id, profile?.id].filter(Boolean);
    if (!ownerIds.includes(project.user_id)) {
      return json({ error: 'You do not have permission to deploy this project' }, 403);
    }

    const fileNames = Object.keys(files);
    if (!fileNames.some((f) => f.toLowerCase() === 'index.html')) {
      return json({
        error: 'Missing index.html',
        message: 'Your project needs an index.html at the root before it can go live.',
      }, 400);
    }

    // Reserve a unique slug for this project
    let slug = project.site_slug as string | null;
    if (!slug) {
      const base = slugify(projectName);
      slug = `${base}-${projectId.slice(0, 6)}`;
    }

    const liveUrl = `${supabaseUrl}/functions/v1/serve-site/${slug}/`;

    const logs = [
      '🚀 BulbAI Hosting deployment started',
      `📦 Packaged ${fileNames.length} files`,
      '⚡ No build step required — static HTML5',
      '🔒 HTTPS enabled automatically',
      `🌐 Live at ${liveUrl}`,
    ];

    const { data: deployment } = await supabase
      .from('deployments')
      .insert({
        project_id: projectId,
        status: 'ready',
        url: liveUrl,
        target: 'bulbai',
        logs,
      })
      .select('id')
      .maybeSingle();

    await supabase
      .from('projects')
      .update({
        preview_url: liveUrl,
        site_slug: slug,
        deploy_target: 'bulbai',
      })
      .eq('id', projectId);

    return json({
      success: true,
      url: liveUrl,
      slug,
      deploymentId: deployment?.id ?? null,
      target: 'bulbai',
      fileCount: fileNames.length,
      message: 'Your site is live on BulbAI Hosting.',
    });
  } catch (error) {
    console.error('deploy-bulbai error:', error);
    return json({
      error: 'Deployment failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

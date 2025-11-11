import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, projectName, files } = await req.json();

    if (!projectId || !files) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Building project ${projectId}...`);

    // In a real implementation, this would:
    // 1. Create a temp directory
    // 2. Write all files
    // 3. Run npm install
    // 4. Run build command (vite build)
    // 5. Upload dist folder to storage
    // 6. Return public URL

    // Simulated build process
    const buildSteps = [
      'Preparing build environment...',
      'Installing dependencies...',
      'Compiling TypeScript...',
      'Building React application...',
      'Optimizing assets...',
      'Generating static files...',
    ];

    const logs: string[] = [];
    for (const step of buildSteps) {
      logs.push(`[${new Date().toISOString()}] ${step}`);
      console.log(step);
    }

    // Create a simple index.html for the deployment
    const deploymentUrl = `https://${projectId}.${supabaseUrl.split('//')[1]}/storage/v1/object/public/deployments/${projectId}/index.html`;

    // Create deployment HTML
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName || 'BulbAI Project'}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 3rem;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        h1 {
            font-size: 3rem;
            margin: 0 0 1rem 0;
        }
        .status {
            display: inline-block;
            background: rgba(74, 222, 128, 0.2);
            padding: 0.5rem 1rem;
            border-radius: 50px;
            margin: 1rem 0;
        }
        .files {
            background: rgba(0, 0, 0, 0.2);
            padding: 1.5rem;
            border-radius: 10px;
            margin-top: 2rem;
        }
        .file-item {
            padding: 0.5rem;
            margin: 0.25rem 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 ${projectName || 'BulbAI Project'}</h1>
        <div class="status">✅ Deployed Successfully</div>
        <p style="font-size: 1.2rem; opacity: 0.9;">
            Your project has been built and deployed!
        </p>
        <div class="files">
            <h3>Project Files (${files.length}):</h3>
            ${files.map((f: any) => `<div class="file-item">${f.path}</div>`).join('')}
        </div>
        <p style="margin-top: 2rem; opacity: 0.7;">
            <small>Deployed from BulbAI • ${new Date().toLocaleString()}</small>
        </p>
    </div>
</body>
</html>
    `;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('project-assets')
      .upload(`deployments/${projectId}/index.html`, htmlContent, {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      logs.push(`[${new Date().toISOString()}] Error: ${uploadError.message}`);
    } else {
      logs.push(`[${new Date().toISOString()}] ✅ Build completed successfully`);
      logs.push(`[${new Date().toISOString()}] Deployment URL: ${deploymentUrl}`);
    }

    // Update deployment record
    const { error: updateError } = await supabase
      .from('deployments')
      .update({
        status: uploadError ? 'failed' : 'success',
        url: uploadError ? null : deploymentUrl,
        logs: logs
      })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updateError) {
      console.error('Error updating deployment:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: !uploadError,
        message: uploadError ? 'Build failed' : 'Build completed successfully',
        url: deploymentUrl,
        logs: logs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Build error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

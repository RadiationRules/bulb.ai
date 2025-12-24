import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  projectId: string;
  projectName: string;
  files: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VERCEL_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    
    if (!VERCEL_TOKEN) {
      console.error('❌ VERCEL_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Vercel not configured', 
          message: 'Please add your VERCEL_API_TOKEN to deploy projects.',
          needsSetup: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { projectId, projectName, files } = await req.json() as DeployRequest;
    
    console.log('🚀 Starting Vercel deployment for:', projectName);

    // Step 1: Create the deployment with files
    const deploymentFiles = Object.entries(files).map(([file, data]) => ({
      file,
      data: typeof data === 'string' ? data : JSON.stringify(data)
    }));

    // Add package.json if not present
    if (!files['package.json']) {
      deploymentFiles.push({
        file: 'package.json',
        data: JSON.stringify({
          name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          version: '1.0.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0'
          },
          devDependencies: {
            '@vitejs/plugin-react': '^4.0.0',
            vite: '^5.0.0',
            typescript: '^5.0.0'
          }
        }, null, 2)
      });
    }

    // Add vite.config.ts if not present
    if (!files['vite.config.ts']) {
      deploymentFiles.push({
        file: 'vite.config.ts',
        data: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});`
      });
    }

    // Add index.html if not present
    if (!files['index.html']) {
      deploymentFiles.push({
        file: 'index.html',
        data: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
      });
    }

    // Add main.tsx if not present
    if (!files['src/main.tsx']) {
      deploymentFiles.push({
        file: 'src/main.tsx',
        data: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
      });
    }

    console.log('📦 Preparing', deploymentFiles.length, 'files for deployment');

    // Create deployment on Vercel
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        files: deploymentFiles,
        projectSettings: {
          framework: 'vite',
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          installCommand: 'npm install',
        },
        target: 'production',
      }),
    });

    const deployData = await deployResponse.json();

    if (!deployResponse.ok) {
      console.error('❌ Vercel API error:', deployData);
      
      // Handle specific error cases
      if (deployData.error?.code === 'forbidden') {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid Vercel token',
            message: 'Your Vercel API token may be expired or invalid. Please update it.',
            needsSetup: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Deployment failed', 
          message: deployData.error?.message || 'Failed to create deployment',
          details: deployData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Deployment created:', deployData.id);
    console.log('🌐 URL:', deployData.url);

    // The URL returned is the deployment URL
    const liveUrl = `https://${deployData.url}`;
    
    // Update our database with the deployment info
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('deployments').insert({
      project_id: projectId,
      status: 'building',
      url: liveUrl,
      logs: [
        '🚀 Deployment started on Vercel',
        `📦 Uploaded ${deploymentFiles.length} files`,
        '🔧 Building project...',
        `🆔 Deployment ID: ${deployData.id}`,
      ]
    });

    // Update project preview_url
    await supabase.from('projects').update({
      preview_url: liveUrl
    }).eq('id', projectId);

    return new Response(
      JSON.stringify({
        success: true,
        deploymentId: deployData.id,
        url: liveUrl,
        readyState: deployData.readyState,
        message: 'Deployment started! Your site will be live in about 30 seconds.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Deploy function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Deployment failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

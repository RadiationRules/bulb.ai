-- Create deployments table
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'building' CHECK (status IN ('building', 'success', 'failed')),
  url TEXT,
  logs TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_env_vars table
CREATE TABLE IF NOT EXISTS public.project_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, key)
);

-- Create project_packages table
CREATE TABLE IF NOT EXISTS public.project_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'latest',
  type TEXT NOT NULL DEFAULT 'dependency' CHECK (type IN ('dependency', 'devDependency')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, package_name)
);

-- Enable RLS
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_env_vars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deployments
CREATE POLICY "Users can view deployments of their projects"
  ON public.deployments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create deployments for their projects"
  ON public.deployments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deployments of their projects"
  ON public.deployments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = deployments.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- RLS Policies for project_env_vars
CREATE POLICY "Users can view env vars of their projects"
  ON public.project_env_vars FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_env_vars.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage env vars of their projects"
  ON public.project_env_vars FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_env_vars.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- RLS Policies for project_packages
CREATE POLICY "Users can view packages of their projects"
  ON public.project_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_packages.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage packages of their projects"
  ON public.project_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_packages.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_deployments_project_id ON public.deployments(project_id);
CREATE INDEX idx_project_env_vars_project_id ON public.project_env_vars(project_id);
CREATE INDEX idx_project_packages_project_id ON public.project_packages(project_id);

-- Add triggers for updated_at
CREATE TRIGGER update_deployments_updated_at
  BEFORE UPDATE ON public.deployments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_env_vars_updated_at
  BEFORE UPDATE ON public.project_env_vars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_packages_updated_at
  BEFORE UPDATE ON public.project_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EnvVar {
  key: string;
  value: string;
  visible: boolean;
}

interface EnvironmentVariablesProps {
  projectId: string;
}

export function EnvironmentVariables({ projectId }: EnvironmentVariablesProps) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEnvVars();
  }, [projectId]);

  const loadEnvVars = async () => {
    const { data, error } = await supabase
      .from('project_env_vars')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error loading env vars:', error);
      return;
    }

    setEnvVars((data || []).map(v => ({ 
      key: v.key, 
      value: v.value, 
      visible: false 
    })));
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '', visible: false }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index][field] = value;
    setEnvVars(newEnvVars);
  };

  const toggleVisibility = (index: number) => {
    const newEnvVars = [...envVars];
    newEnvVars[index].visible = !newEnvVars[index].visible;
    setEnvVars(newEnvVars);
  };

  const saveEnvVars = async () => {
    setLoading(true);
    try {
      // Delete existing vars
      await supabase
        .from('project_env_vars')
        .delete()
        .eq('project_id', projectId);

      // Insert new vars
      const validVars = envVars.filter(v => v.key && v.value);
      if (validVars.length > 0) {
        const { error } = await supabase
          .from('project_env_vars')
          .insert(
            validVars.map(v => ({
              project_id: projectId,
              key: v.key,
              value: v.value
            }))
          );

        if (error) throw error;
      }

      toast({
        title: 'Environment variables saved',
        description: 'Your changes have been saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving variables',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Environment Variables</h3>
        <div className="flex gap-2">
          <Button onClick={addEnvVar} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
          <Button onClick={saveEnvVars} disabled={loading} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save All
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {envVars.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No environment variables yet. Click "Add Variable" to create one.
            </div>
          ) : (
            envVars.map((envVar, index) => (
              <div key={index} className="flex gap-2 items-start p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div>
                    <Label htmlFor={`key-${index}`}>Key</Label>
                    <Input
                      id={`key-${index}`}
                      placeholder="VARIABLE_NAME"
                      value={envVar.key}
                      onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`value-${index}`}>Value</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`value-${index}`}
                        type={envVar.visible ? 'text' : 'password'}
                        placeholder="value"
                        value={envVar.value}
                        onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleVisibility(index)}
                      >
                        {envVar.visible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEnvVar(index)}
                  className="mt-6"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

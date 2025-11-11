import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Search, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PackageInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
}

interface PackageManagerProps {
  projectId: string;
}

export function PackageManager({ projectId }: PackageManagerProps) {
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPackages();
  }, [projectId]);

  const loadPackages = async () => {
    const { data, error } = await supabase
      .from('project_packages')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error loading packages:', error);
      return;
    }

    setPackages((data || []).map(p => ({
      name: p.package_name,
      version: p.version,
      type: p.type as 'dependency' | 'devDependency'
    })));
  };

  const addPackage = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const packageName = searchQuery.trim();
      
      // Check if package already exists
      if (packages.some(p => p.name === packageName)) {
        toast({
          title: 'Package already installed',
          variant: 'destructive',
        });
        return;
      }

      // Add package (in real implementation, would fetch version from npm)
      const { error } = await supabase
        .from('project_packages')
        .insert({
          project_id: projectId,
          package_name: packageName,
          version: 'latest',
          type: 'dependency'
        });

      if (error) throw error;

      await loadPackages();
      setSearchQuery('');
      
      toast({
        title: 'Package added',
        description: `${packageName} has been added to your project`,
      });
    } catch (error: any) {
      toast({
        title: 'Error adding package',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removePackage = async (packageName: string) => {
    try {
      const { error } = await supabase
        .from('project_packages')
        .delete()
        .eq('project_id', projectId)
        .eq('package_name', packageName);

      if (error) throw error;

      await loadPackages();
      
      toast({
        title: 'Package removed',
        description: `${packageName} has been removed from your project`,
      });
    } catch (error: any) {
      toast({
        title: 'Error removing package',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Package Manager</h3>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search npm packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPackage()}
              className="pl-10"
            />
          </div>
          <Button onClick={addPackage} disabled={loading || !searchQuery.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Install
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p>No packages installed yet</p>
              <p className="text-sm">Search and install npm packages above</p>
            </div>
          ) : (
            packages.map((pkg) => (
              <div
                key={pkg.name}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pkg.name}</span>
                    <Badge variant="outline" className="text-xs">
                      v{pkg.version}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{pkg.type}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePackage(pkg.name)}
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

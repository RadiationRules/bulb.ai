import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Globe, 
  Lock, 
  Calendar, 
  Tag, 
  Trash2, 
  Copy,
  ExternalLink,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
  projectVisibility: 'public' | 'private';
  projectTags?: string[];
  projectCreatedAt: string;
  onUpdate: () => void;
}

const PROJECT_TYPES = [
  { value: 'web', label: 'Web App' },
  { value: 'design', label: 'Design' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'games', label: 'Game' },
  { value: 'music', label: 'Music' },
  { value: 'education', label: 'Education' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
];

export const ProjectSettingsModal = ({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  projectDescription = '',
  projectVisibility,
  projectTags = [],
  projectCreatedAt,
  onUpdate,
}: ProjectSettingsModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [title, setTitle] = useState(projectTitle);
  const [description, setDescription] = useState(projectDescription);
  const [visibility, setVisibility] = useState<'public' | 'private'>(projectVisibility);
  const [tags, setTags] = useState(projectTags);
  const [projectType, setProjectType] = useState(projectTags[0] || 'web');
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTitle(projectTitle);
    setDescription(projectDescription);
    setVisibility(projectVisibility);
    setTags(projectTags);
    setProjectType(projectTags[0] || 'web');
  }, [projectTitle, projectDescription, projectVisibility, projectTags]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedTags = [projectType, ...tags.filter(t => t !== projectType)];
      
      const { error } = await supabase
        .from('projects')
        .update({
          title,
          description,
          visibility,
          tags: updatedTags,
        })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your project settings have been updated.',
      });
      
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== projectTitle) return;
    
    setDeleting(true);
    try {
      // Delete project files first
      await supabase
        .from('project_files')
        .delete()
        .eq('project_id', projectId);

      // Delete project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Project deleted',
        description: 'Your project has been permanently deleted.',
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const { data: originalProject, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const { data: originalFiles, error: filesError } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId);

      if (filesError) throw filesError;

      const { data: newProject, error: newProjectError } = await supabase
        .from('projects')
        .insert({
          title: `${title} (Copy)`,
          description,
          owner_id: originalProject.owner_id,
          visibility: 'private',
          tags,
        })
        .select()
        .single();

      if (newProjectError) throw newProjectError;

      if (originalFiles && originalFiles.length > 0) {
        const newFiles = originalFiles.map(file => ({
          project_id: newProject.id,
          file_path: file.file_path,
          file_content: file.file_content,
          file_type: file.file_type,
        }));

        await supabase.from('project_files').insert(newFiles);
      }

      toast({
        title: 'Project duplicated',
        description: 'Opening the new project...',
      });
      
      onOpenChange(false);
      navigate(`/workspace/${newProject.id}`);
    } catch (error) {
      console.error('Error duplicating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate project. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Configure your project settings and visibility
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Project"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your project do?"
              rows={3}
            />
          </div>

          {/* Project Type */}
          <div className="space-y-2">
            <Label>Project Type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This helps categorize your project in the Explore page
            </p>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {visibility === 'public' ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {visibility === 'public' ? 'Public' : 'Private'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {visibility === 'public' 
                    ? 'Anyone can view this project' 
                    : 'Only you can access this project'}
                </p>
              </div>
            </div>
            <Switch
              checked={visibility === 'public'}
              onCheckedChange={(checked) => setVisibility(checked ? 'public' : 'private')}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tags..."
                className="flex-1"
              />
              <Button onClick={addTag} variant="outline" size="sm">
                <Tag className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Creation Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Created {new Date(projectCreatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleDuplicate} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(`/workspace/${projectId}`, '_blank')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>

          <Separator />

          {/* Delete Section */}
          <div className="space-y-4">
            {!showDeleteConfirm ? (
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </Button>
            ) : (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Delete Project?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This action cannot be undone. Type <strong>"{projectTitle}"</strong> to confirm.
                    </p>
                  </div>
                </div>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type project name to confirm"
                  className="border-destructive/50"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteConfirmText !== projectTitle || deleting}
                    className="flex-1"
                  >
                    {deleting ? 'Deleting...' : 'Delete Forever'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Sparkles className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

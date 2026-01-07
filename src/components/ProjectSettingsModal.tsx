import { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Image,
  Upload,
  X
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

// Generate a random project preview image
const generatePreviewImage = (title: string) => {
  const colors = ['3b82f6', '8b5cf6', 'ec4899', '10b981', 'f59e0b', '6366f1'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return `https://placehold.co/800x450/${color}/white?text=${encodeURIComponent(title.substring(0, 20))}`;
};

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
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Image states
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  useEffect(() => {
    setTitle(projectTitle);
    setDescription(projectDescription);
    setVisibility(projectVisibility);
    setTags(projectTags);
    setProjectType(projectTags[0] || 'web');
    // Generate default preview if none exists
    if (!previewImageUrl) {
      setPreviewImageUrl(generatePreviewImage(projectTitle));
    }
  }, [projectTitle, projectDescription, projectVisibility, projectTags]);

  const handleImageUpload = async (file: File, type: 'favicon' | 'preview') => {
    const isUploading = type === 'favicon' ? setUploadingFavicon : setUploadingPreview;
    const setUrl = type === 'favicon' ? setFaviconUrl : setPreviewImageUrl;
    
    isUploading(true);
    try {
      // For demo purposes, create a local URL
      // In production, you'd upload to Supabase Storage
      const url = URL.createObjectURL(file);
      setUrl(url);
      
      toast({
        title: `${type === 'favicon' ? 'Favicon' : 'Preview image'} updated`,
        description: 'Image will be saved with your project settings.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      isUploading(false);
    }
  };

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
          preview_url: previewImageUrl || null,
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

          {/* Project Images Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Project Images</Label>
            
            {/* Preview Image */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Preview Image (shown in Explore)</p>
              <div className="relative group">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                  {previewImageUrl ? (
                    <img 
                      src={previewImageUrl} 
                      alt="Project preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => previewInputRef.current?.click()}
                      disabled={uploadingPreview}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {uploadingPreview ? 'Uploading...' : 'Upload'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setPreviewImageUrl(generatePreviewImage(title))}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Generate
                    </Button>
                  </div>
                </div>
                <input
                  ref={previewInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'preview');
                  }}
                />
              </div>
            </div>

            {/* Favicon */}
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <p className="text-xs text-muted-foreground">Favicon (site icon)</p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center cursor-pointer overflow-hidden bg-muted"
                    onClick={() => faviconInputRef.current?.click()}
                  >
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                    </Button>
                  </div>
                  {faviconUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFaviconUrl('')}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'favicon');
                  }}
                />
              </div>
            </div>
          </div>

          {/* Visibility - Enhanced */}
          <div className="space-y-3">
            <Label>Visibility</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                  visibility === 'private' 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <Lock className={cn("w-5 h-5", visibility === 'private' ? "text-primary" : "text-muted-foreground")} />
                <div className="text-left">
                  <p className={cn("font-medium text-sm", visibility === 'private' && "text-primary")}>Private</p>
                  <p className="text-xs text-muted-foreground">Only you</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                  visibility === 'public' 
                    ? "border-green-500 bg-green-500/10" 
                    : "border-border hover:border-green-500/50"
                )}
              >
                <Globe className={cn("w-5 h-5", visibility === 'public' ? "text-green-500" : "text-muted-foreground")} />
                <div className="text-left">
                  <p className={cn("font-medium text-sm", visibility === 'public' && "text-green-600")}>Public</p>
                  <p className="text-xs text-muted-foreground">Everyone</p>
                </div>
              </button>
            </div>
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

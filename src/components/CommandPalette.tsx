import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  File,
  FolderOpen,
  Search,
  Settings,
  Users,
  GitBranch,
  Rocket,
  Terminal as TerminalIcon,
  Package,
  Activity,
  Code,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: Array<{ id: string; file_path: string; file_type: string }>;
  onSelectFile: (path: string) => void;
  onOpenPanel: (panel: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  files,
  onSelectFile,
  onOpenPanel,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const filteredFiles = files.filter(file =>
    file.file_path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {filteredFiles.length > 0 && (
          <>
            <CommandGroup heading="Files">
              {filteredFiles.slice(0, 5).map((file) => (
                <CommandItem
                  key={file.id}
                  onSelect={() => {
                    onSelectFile(file.file_path);
                    onOpenChange(false);
                  }}
                >
                  <File className="mr-2 h-4 w-4" />
                  <span>{file.file_path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onOpenPanel('git');
              onOpenChange(false);
            }}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Open Git Panel
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenPanel('deployment');
              onOpenChange(false);
            }}
          >
            <Rocket className="mr-2 h-4 w-4" />
            Deploy Project
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenPanel('terminal');
              onOpenChange(false);
            }}
          >
            <TerminalIcon className="mr-2 h-4 w-4" />
            Open Terminal
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenPanel('packages');
              onOpenChange(false);
            }}
          >
            <Package className="mr-2 h-4 w-4" />
            Manage Packages
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenPanel('collaboration');
              onOpenChange(false);
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            View Collaborators
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenPanel('activity');
              onOpenChange(false);
            }}
          >
            <Activity className="mr-2 h-4 w-4" />
            Activity Feed
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              navigate('/dashboard');
              onOpenChange(false);
            }}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Go to Dashboard
          </CommandItem>
          <CommandItem
            onSelect={() => {
              navigate('/dashboard?tab=settings');
              onOpenChange(false);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Open Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

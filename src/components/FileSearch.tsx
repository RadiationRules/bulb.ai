import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { File, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: Array<{ path: string; type: 'file' | 'folder' }>;
  onSelectFile: (path: string) => void;
}

export function FileSearch({ open, onOpenChange, files, onSelectFile }: FileSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredFiles = useMemo(() => {
    if (!query) return files;
    const lowerQuery = query.toLowerCase();
    return files
      .filter(f => f.path.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        const aIndex = a.path.toLowerCase().indexOf(lowerQuery);
        const bIndex = b.path.toLowerCase().indexOf(lowerQuery);
        return aIndex - bIndex;
      });
  }, [query, files]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredFiles[selectedIndex]) {
      e.preventDefault();
      const selected = filteredFiles[selectedIndex];
      if (selected.type === 'file') {
        onSelectFile(selected.path);
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Files</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Type to search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {filteredFiles.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No files found</p>
              ) : (
                filteredFiles.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => {
                      if (file.type === 'file') {
                        onSelectFile(file.path);
                        onOpenChange(false);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors',
                      selectedIndex === idx
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted',
                      file.type === 'folder' && 'opacity-50 cursor-not-allowed'
                    )}
                    disabled={file.type === 'folder'}
                  >
                    {file.type === 'file' ? (
                      <File className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Folder className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{file.path}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground text-center">
            Use ↑↓ arrows to navigate, Enter to select
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

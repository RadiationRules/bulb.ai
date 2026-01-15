import { useState } from 'react';
import { FolderOpen, Folder, ChevronRight, ChevronDown, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileIcon } from './FileIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeProps {
  files: Array<{ file_path: string; id: string; file_content: string; file_type: string }>;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFiles: (paths: string[]) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onMoveFile: (path: string, newFolder: string) => void;
  selectedFolder?: string;
  onSelectFolder?: (path: string) => void;
}

export const FileTree = ({ 
  files, 
  activeFile, 
  onSelectFile, 
  onCreateFile, 
  onDeleteFiles, 
  onRenameFile,
  onMoveFile,
  selectedFolder,
  onSelectFolder 
}: FileTreeProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const { toast } = useToast();

  // Build tree structure from flat file list
  const buildTree = (): FileNode[] => {
    const root: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    files.forEach(file => {
      const parts = file.file_path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (i === parts.length - 1) {
          // It's a file
          const fileNode: FileNode = {
            name: part,
            path: file.file_path,
            type: 'file'
          };
          
          if (parentPath && folderMap.has(parentPath)) {
            folderMap.get(parentPath)!.children!.push(fileNode);
          } else {
            root.push(fileNode);
          }
        } else {
          // It's a folder
          if (!folderMap.has(currentPath)) {
            const folderNode: FileNode = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: []
            };
            
            folderMap.set(currentPath, folderNode);
            
            if (parentPath && folderMap.has(parentPath)) {
              folderMap.get(parentPath)!.children!.push(folderNode);
            } else {
              root.push(folderNode);
            }
          }
        }
      }
    });

    return root.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const tree = buildTree();

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDelete = (paths: string[]) => {
    onDeleteFiles(paths);
    setSelectedItems(new Set());
  };

  const handleRename = (oldPath: string, newName: string) => {
    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    onRenameFile(oldPath, newPath);
    setRenamingItem(null);
    setNewName('');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, path: string, type: 'file' | 'folder') => {
    e.stopPropagation();
    setDraggedItem(path);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.setData('application/x-file-type', type);
  };

  const handleDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem && draggedItem !== folderPath && !draggedItem.startsWith(folderPath + '/')) {
      setDragOverFolder(folderPath);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    
    const sourcePath = e.dataTransfer.getData('text/plain');
    
    if (!sourcePath || sourcePath === targetFolder) {
      setDraggedItem(null);
      return;
    }

    // Don't allow dropping into self or child folders
    if (sourcePath === targetFolder || targetFolder.startsWith(sourcePath + '/')) {
      setDraggedItem(null);
      return;
    }

    const fileName = sourcePath.split('/').pop();
    const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

    if (newPath && newPath !== sourcePath) {
      onMoveFile(sourcePath, targetFolder);
      toast({
        title: 'File moved',
        description: `${fileName} → ${targetFolder || 'root'}`,
        duration: 2000
      });
    }
    
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverFolder(null);
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = activeFile === node.path;
    const isSelected = selectedItems.has(node.path);
    const isDragOver = dragOverFolder === node.path;
    const isBeingDragged = draggedItem === node.path;

    return (
      <div key={node.path}>
        <div
          className={cn(
            "group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all hover:bg-accent/70",
            isActive && "bg-primary/10 text-primary font-medium",
            isSelected && "bg-accent",
            isDragOver && node.type === 'folder' && "bg-primary/20 ring-2 ring-primary ring-offset-1",
            isBeingDragged && "opacity-50"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          draggable={!renamingItem}
          onDragStart={(e) => handleDragStart(e, node.path, node.type)}
          onDragOver={(e) => node.type === 'folder' ? handleDragOver(e, node.path) : undefined}
          onDragLeave={handleDragLeave}
          onDrop={(e) => node.type === 'folder' ? handleDrop(e, node.path) : undefined}
          onDragEnd={handleDragEnd}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
              onSelectFolder?.(node.path);
            } else {
              onSelectFile(node.path);
            }
          }}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-bulb-glow flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-bulb-glow flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <div className="w-4" />
              <FileIcon filename={node.name} type="file" className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </>
          )}
          
          {renamingItem === node.path ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                if (newName.trim()) {
                  handleRename(node.path, newName);
                } else {
                  setRenamingItem(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  handleRename(node.path, newName);
                } else if (e.key === 'Escape') {
                  setRenamingItem(null);
                  setNewName('');
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0 text-sm bg-background border rounded"
              autoFocus
            />
          ) : (
            <span className="text-sm truncate flex-1">{node.name}</span>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingItem(node.path);
                  setNewName(node.name);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete([node.path]);
                }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {node.type === 'folder' && isExpanded && node.children && (
          <div className="animate-accordion-down">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Handle drop on root (empty space)
  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData('text/plain');
    
    if (sourcePath && sourcePath.includes('/')) {
      const fileName = sourcePath.split('/').pop();
      onMoveFile(sourcePath, '');
      toast({
        title: 'File moved to root',
        description: fileName,
        duration: 2000
      });
    }
    
    setDraggedItem(null);
    setDragOverFolder(null);
  };

  return (
    <div 
      className="space-y-0.5 min-h-[100px]"
      onDragOver={(e) => {
        e.preventDefault();
        if (draggedItem) {
          setDragOverFolder('__root__');
        }
      }}
      onDragLeave={() => setDragOverFolder(null)}
      onDrop={handleRootDrop}
    >
      {tree.map(node => renderNode(node))}
      {dragOverFolder === '__root__' && draggedItem?.includes('/') && (
        <div className="mx-2 p-2 border-2 border-dashed border-primary/50 rounded text-xs text-center text-muted-foreground">
          Drop here to move to root
        </div>
      )}
    </div>
  );
};

import {
  FileText,
  FileCode,
  FileJson,
  Image,
  FileVideo,
  FileAudio,
  File,
  Folder,
} from 'lucide-react';

interface FileIconProps {
  filename: string;
  type: 'file' | 'folder';
  className?: string;
}

export function FileIcon({ filename, type, className }: FileIconProps) {
  if (type === 'folder') {
    return <Folder className={className} />;
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Code files
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs'].includes(ext)) {
    return <FileCode className={className} />;
  }

  // Markup/Style files
  if (['html', 'css', 'scss', 'sass', 'xml'].includes(ext)) {
    return <FileCode className={className} />;
  }

  // JSON/Config files
  if (['json', 'yaml', 'yml', 'toml', 'ini', 'env'].includes(ext)) {
    return <FileJson className={className} />;
  }

  // Text/Documentation
  if (['md', 'txt', 'log', 'readme'].includes(ext)) {
    return <FileText className={className} />;
  }

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
    return <Image className={className} />;
  }

  // Video
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return <FileVideo className={className} />;
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return <FileAudio className={className} />;
  }

  // Default
  return <File className={className} />;
}

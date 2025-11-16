import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      shortcuts.forEach(({ key, ctrl, shift, alt, action }) => {
        if (
          e.key.toLowerCase() === key.toLowerCase() &&
          (ctrl === undefined || e.ctrlKey === ctrl || e.metaKey === ctrl) &&
          (shift === undefined || e.shiftKey === shift) &&
          (alt === undefined || e.altKey === alt)
        ) {
          e.preventDefault();
          action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);

  const showShortcuts = () => {
    const shortcutsList = shortcuts
      .map(({ key, ctrl, shift, alt, description }) => {
        const parts = [];
        if (ctrl) parts.push('Ctrl');
        if (shift) parts.push('Shift');
        if (alt) parts.push('Alt');
        parts.push(key.toUpperCase());
        return `${parts.join('+')} - ${description}`;
      })
      .join('\n');

    toast({
      title: 'Keyboard Shortcuts',
      description: (
        <pre className="text-xs whitespace-pre-wrap">{shortcutsList}</pre>
      ),
    });
  };

  return { showShortcuts };
}

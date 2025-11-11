import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';

interface TerminalProps {
  onClose: () => void;
}

export function Terminal({ onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentCommand, setCurrentCommand] = useState('');

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
      },
      rows: 20,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('BulbAI Terminal v1.0');
    term.writeln('Type "help" for available commands');
    term.write('\r\n$ ');

    let command = '';

    term.onData((data) => {
      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        term.write('\r\n');
        if (command.trim()) {
          executeCommand(command.trim());
          setCommandHistory(prev => [...prev, command.trim()]);
          setHistoryIndex(-1);
        }
        command = '';
        term.write('$ ');
      } else if (code === 127) { // Backspace
        if (command.length > 0) {
          command = command.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code === 27) { // Escape sequences (arrows)
        // Handle arrow keys for history
        return;
      } else if (code < 32) { // Control characters
        return;
      } else {
        command += data;
        term.write(data);
      }
      setCurrentCommand(command);
    });

    const executeCommand = (cmd: string) => {
      const parts = cmd.split(' ');
      const mainCmd = parts[0];

      switch (mainCmd) {
        case 'help':
          term.writeln('Available commands:');
          term.writeln('  help       - Show this help message');
          term.writeln('  clear      - Clear terminal');
          term.writeln('  ls         - List files (simulated)');
          term.writeln('  pwd        - Print working directory');
          term.writeln('  echo       - Echo text');
          term.writeln('  date       - Show current date/time');
          break;
        case 'clear':
          term.clear();
          break;
        case 'ls':
          term.writeln('src/');
          term.writeln('public/');
          term.writeln('package.json');
          term.writeln('README.md');
          break;
        case 'pwd':
          term.writeln('/workspace/project');
          break;
        case 'echo':
          term.writeln(parts.slice(1).join(' '));
          break;
        case 'date':
          term.writeln(new Date().toString());
          break;
        default:
          term.writeln(`Command not found: ${mainCmd}`);
          term.writeln('Type "help" for available commands');
      }
    };

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  const handleClear = () => {
    xtermRef.current?.clear();
    xtermRef.current?.write('$ ');
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-sm font-medium">Terminal</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 w-7 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}

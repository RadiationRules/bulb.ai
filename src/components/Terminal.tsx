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
          term.writeln('\x1b[36mAvailable commands:\x1b[0m');
          term.writeln('');
          term.writeln('\x1b[33mGeneral:\x1b[0m');
          term.writeln('  help       - Show this help message');
          term.writeln('  clear      - Clear terminal');
          term.writeln('  date       - Show current date/time');
          term.writeln('  uptime     - Show session uptime');
          term.writeln('  whoami     - Show current user');
          term.writeln('  version    - Show BulbAI version');
          term.writeln('');
          term.writeln('\x1b[33mFile System:\x1b[0m');
          term.writeln('  ls         - List files in current directory');
          term.writeln('  pwd        - Print working directory');
          term.writeln('  cat        - Display file contents');
          term.writeln('  touch      - Create empty file');
          term.writeln('  mkdir      - Create directory');
          term.writeln('  rm         - Remove file');
          term.writeln('  tree       - Show directory tree');
          term.writeln('');
          term.writeln('\x1b[33mDevelopment:\x1b[0m');
          term.writeln('  npm        - Package manager');
          term.writeln('  node       - Run JavaScript');
          term.writeln('  git        - Version control');
          term.writeln('  build      - Build project');
          term.writeln('  deploy     - Deploy to Vercel');
          term.writeln('  test       - Run tests');
          term.writeln('');
          term.writeln('\x1b[33mFun:\x1b[0m');
          term.writeln('  neofetch   - System info');
          term.writeln('  matrix     - Matrix animation');
          term.writeln('  fortune    - Random quote');
          term.writeln('  cowsay     - Cow says something');
          break;
        case 'clear':
          term.clear();
          break;
        case 'ls':
          term.writeln('\x1b[34msrc/\x1b[0m');
          term.writeln('\x1b[34mpublic/\x1b[0m');
          term.writeln('\x1b[34mnode_modules/\x1b[0m');
          term.writeln('package.json');
          term.writeln('README.md');
          term.writeln('vite.config.ts');
          term.writeln('tsconfig.json');
          term.writeln('.gitignore');
          break;
        case 'pwd':
          term.writeln('/home/user/workspace/project');
          break;
        case 'echo':
          term.writeln(parts.slice(1).join(' '));
          break;
        case 'date':
          term.writeln(new Date().toString());
          break;
        case 'uptime':
          term.writeln(`System uptime: ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`);
          break;
        case 'whoami':
          term.writeln('developer@bulbai');
          break;
        case 'version':
          term.writeln('\x1b[36mBulbAI Terminal v2.0.0\x1b[0m');
          term.writeln('Powered by GPT-5 AI Engine');
          break;
        case 'cat':
          if (parts[1]) {
            term.writeln(`\x1b[32m// Contents of ${parts[1]}\x1b[0m`);
            term.writeln('export default function App() {');
            term.writeln('  return <div>Hello World</div>;');
            term.writeln('}');
          } else {
            term.writeln('\x1b[31mUsage: cat <filename>\x1b[0m');
          }
          break;
        case 'touch':
          if (parts[1]) {
            term.writeln(`\x1b[32m✓ Created ${parts[1]}\x1b[0m`);
          } else {
            term.writeln('\x1b[31mUsage: touch <filename>\x1b[0m');
          }
          break;
        case 'mkdir':
          if (parts[1]) {
            term.writeln(`\x1b[32m✓ Created directory ${parts[1]}/\x1b[0m`);
          } else {
            term.writeln('\x1b[31mUsage: mkdir <dirname>\x1b[0m');
          }
          break;
        case 'rm':
          if (parts[1]) {
            term.writeln(`\x1b[33m⚠ Removed ${parts[1]}\x1b[0m`);
          } else {
            term.writeln('\x1b[31mUsage: rm <filename>\x1b[0m');
          }
          break;
        case 'tree':
          term.writeln('.');
          term.writeln('├── \x1b[34msrc/\x1b[0m');
          term.writeln('│   ├── \x1b[34mcomponents/\x1b[0m');
          term.writeln('│   ├── \x1b[34mpages/\x1b[0m');
          term.writeln('│   ├── \x1b[34mhooks/\x1b[0m');
          term.writeln('│   ├── App.tsx');
          term.writeln('│   └── main.tsx');
          term.writeln('├── \x1b[34mpublic/\x1b[0m');
          term.writeln('├── package.json');
          term.writeln('└── README.md');
          break;
        case 'npm':
          if (parts[1] === 'install' || parts[1] === 'i') {
            term.writeln('\x1b[36m⠋ Installing packages...\x1b[0m');
            setTimeout(() => term.writeln('\x1b[32m✓ Packages installed successfully\x1b[0m'), 500);
          } else if (parts[1] === 'run') {
            term.writeln(`\x1b[36m⠋ Running ${parts[2] || 'dev'}...\x1b[0m`);
          } else {
            term.writeln('npm <install|run> [script]');
          }
          break;
        case 'node':
          if (parts[1]) {
            term.writeln(`\x1b[36mExecuting ${parts[1]}...\x1b[0m`);
            term.writeln('\x1b[32m✓ Script completed\x1b[0m');
          } else {
            term.writeln('Node.js v18.17.0');
          }
          break;
        case 'git':
          if (parts[1] === 'status') {
            term.writeln('On branch \x1b[32mmain\x1b[0m');
            term.writeln('Your branch is up to date.');
            term.writeln('');
            term.writeln('Changes not staged for commit:');
            term.writeln('  \x1b[31mmodified:   src/App.tsx\x1b[0m');
          } else if (parts[1] === 'log') {
            term.writeln('\x1b[33mcommit abc123\x1b[0m (HEAD -> main)');
            term.writeln('Author: You <you@example.com>');
            term.writeln('Date:   Today');
            term.writeln('');
            term.writeln('    Initial commit');
          } else {
            term.writeln('git <status|log|add|commit|push>');
          }
          break;
        case 'build':
          term.writeln('\x1b[36m⠋ Building project...\x1b[0m');
          term.writeln('  Compiling TypeScript...');
          term.writeln('  Bundling assets...');
          term.writeln('  Optimizing...');
          term.writeln('\x1b[32m✓ Build completed in 2.3s\x1b[0m');
          break;
        case 'deploy':
          term.writeln('\x1b[36m🚀 Deploying to Vercel...\x1b[0m');
          term.writeln('  Building project...');
          term.writeln('  Uploading files...');
          term.writeln('  Configuring DNS...');
          term.writeln('\x1b[32m✓ Deployed: https://your-app.vercel.app\x1b[0m');
          break;
        case 'test':
          term.writeln('\x1b[36mRunning tests...\x1b[0m');
          term.writeln('');
          term.writeln(' \x1b[32m✓\x1b[0m App renders without crashing');
          term.writeln(' \x1b[32m✓\x1b[0m Button click works');
          term.writeln(' \x1b[32m✓\x1b[0m API calls succeed');
          term.writeln('');
          term.writeln('\x1b[32mAll 3 tests passed\x1b[0m');
          break;
        case 'neofetch':
          term.writeln('\x1b[36m    ____        _ _          _    ___ \x1b[0m');
          term.writeln('\x1b[36m   |  _ \\      | | |        / \\  |_ _|\x1b[0m');
          term.writeln('\x1b[36m   | |_) |_   _| | |__     / _ \\  | | \x1b[0m');
          term.writeln('\x1b[36m   |  _ <| | | | |  _ \\   / ___ \\ | | \x1b[0m');
          term.writeln('\x1b[36m   |_| \\_\\_,_|_|_|_|_) | /_/   \\_\\___|\x1b[0m');
          term.writeln('');
          term.writeln('   \x1b[33mOS:\x1b[0m BulbAI Cloud v2.0');
          term.writeln('   \x1b[33mKernel:\x1b[0m GPT-5 Neural Core');
          term.writeln('   \x1b[33mShell:\x1b[0m BulbAI Terminal');
          term.writeln('   \x1b[33mTheme:\x1b[0m Dark Mode');
          term.writeln('   \x1b[33mCPU:\x1b[0m AI Accelerated');
          term.writeln('   \x1b[33mMemory:\x1b[0m ∞ Cloud');
          break;
        case 'matrix':
          term.writeln('\x1b[32m');
          for (let i = 0; i < 5; i++) {
            let line = '';
            for (let j = 0; j < 50; j++) {
              line += Math.random() > 0.5 ? Math.floor(Math.random() * 2) : ' ';
            }
            term.writeln(line);
          }
          term.writeln('\x1b[0m');
          break;
        case 'fortune':
          const fortunes = [
            '"Code is like humor. When you have to explain it, it\'s bad."',
            '"First, solve the problem. Then, write the code."',
            '"Any fool can write code that a computer can understand."',
            '"The best error message is the one that never shows up."',
            '"Talk is cheap. Show me the code."',
          ];
          term.writeln(`\x1b[33m${fortunes[Math.floor(Math.random() * fortunes.length)]}\x1b[0m`);
          break;
        case 'cowsay':
          const text = parts.slice(1).join(' ') || 'Moo!';
          term.writeln(` ${'_'.repeat(text.length + 2)}`);
          term.writeln(`< ${text} >`);
          term.writeln(` ${'-'.repeat(text.length + 2)}`);
          term.writeln('        \\   ^__^');
          term.writeln('         \\  (oo)\\_______');
          term.writeln('            (__)\\       )\\/\\');
          term.writeln('                ||----w |');
          term.writeln('                ||     ||');
          break;
        default:
          term.writeln(`\x1b[31mCommand not found: ${mainCmd}\x1b[0m`);
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

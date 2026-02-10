import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';

interface ProjectFile {
  id: string;
  file_path: string;
  file_content: string;
  file_type: string;
}

interface TerminalProps {
  onClose: () => void;
  files?: ProjectFile[];
  onCreateFile?: (path: string, content: string, type: string) => void;
  onDeleteFile?: (path: string) => void;
  onCommit?: (message: string) => void;
  projectName?: string;
}

export function Terminal({ onClose, files = [], onCreateFile, onDeleteFile, onCommit, projectName = 'project' }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const filesRef = useRef(files);
  const cmdHistoryRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const stagedRef = useRef<Set<string>>(new Set());

  useEffect(() => { filesRef.current = files; }, [files]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: { background: '#0d1117', foreground: '#c9d1d9', cursor: '#58a6ff', selectionBackground: '#264f78' },
      rows: 20,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    term.writeln('\x1b[36m╔══════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[36m║    BulbAI Smart Terminal v2.0       ║\x1b[0m');
    term.writeln('\x1b[36m╚══════════════════════════════════════╝\x1b[0m');
    term.writeln('Type \x1b[33mhelp\x1b[0m for commands\n');
    term.write('\x1b[32m~/workspace\x1b[0m \x1b[36m$\x1b[0m ');

    let command = '';

    const prompt = () => term.write('\x1b[32m~/workspace\x1b[0m \x1b[36m$\x1b[0m ');

    const getFiles = () => filesRef.current;

    // Build folder structure from files
    const getFolders = (): Set<string> => {
      const folders = new Set<string>();
      getFiles().forEach(f => {
        const parts = f.file_path.split('/');
        for (let i = 1; i < parts.length; i++) {
          folders.add(parts.slice(0, i).join('/'));
        }
      });
      return folders;
    };

    const listDir = (dir: string) => {
      const items = new Set<string>();
      const prefix = dir ? dir + '/' : '';
      
      getFiles().forEach(f => {
        if (dir && !f.file_path.startsWith(prefix)) return;
        if (!dir && f.file_path.includes('/')) {
          items.add('\x1b[34m' + f.file_path.split('/')[0] + '/\x1b[0m');
        } else if (!dir) {
          items.add(f.file_path);
        } else {
          const rest = f.file_path.slice(prefix.length);
          if (rest.includes('/')) {
            items.add('\x1b[34m' + rest.split('/')[0] + '/\x1b[0m');
          } else {
            items.add(rest);
          }
        }
      });
      
      return Array.from(items).sort();
    };

    const exec = (cmd: string) => {
      const args = cmd.match(/(?:[^\s"]+|"[^"]*")/g)?.map(s => s.replace(/"/g, '')) || [];
      const main = args[0];

      switch (main) {
        case 'help':
          term.writeln('\x1b[36m── File System ──────────────────\x1b[0m');
          term.writeln('  ls [dir]     List files');
          term.writeln('  cat <file>   Show file contents');
          term.writeln('  touch <file> Create empty file');
          term.writeln('  mkdir <dir>  Create directory');
          term.writeln('  rm <file>    Delete file');
          term.writeln('  tree         Show file tree');
          term.writeln('  pwd          Working directory');
          term.writeln('');
          term.writeln('\x1b[36m── Git ─────────────────────────\x1b[0m');
          term.writeln('  git status      Show changes');
          term.writeln('  git add <file>  Stage file');
          term.writeln('  git add .       Stage all');
          term.writeln('  git commit -m   Commit changes');
          term.writeln('  git log         Show commits');
          term.writeln('  git diff        Show diffs');
          term.writeln('');
          term.writeln('\x1b[36m── General ─────────────────────\x1b[0m');
          term.writeln('  clear    Clear terminal');
          term.writeln('  echo     Print text');
          term.writeln('  date     Current date');
          term.writeln('  whoami   Current user');
          term.writeln('  neofetch System info');
          break;

        case 'clear':
          term.clear();
          break;

        case 'ls': {
          const dir = args[1] || '';
          const items = listDir(dir);
          if (items.length === 0) {
            term.writeln(dir ? `ls: ${dir}: No such directory` : '(empty)');
          } else {
            items.forEach(i => term.writeln('  ' + i));
          }
          break;
        }

        case 'cat': {
          if (!args[1]) { term.writeln('\x1b[31mUsage: cat <file>\x1b[0m'); break; }
          const file = getFiles().find(f => f.file_path === args[1]);
          if (!file) {
            term.writeln(`\x1b[31mcat: ${args[1]}: No such file\x1b[0m`);
          } else {
            const lines = (file.file_content || '').split('\n');
            lines.forEach((line, i) => {
              term.writeln(`\x1b[90m${String(i + 1).padStart(3)}\x1b[0m  ${line}`);
            });
          }
          break;
        }

        case 'touch': {
          if (!args[1]) { term.writeln('\x1b[31mUsage: touch <file>\x1b[0m'); break; }
          const existing = getFiles().find(f => f.file_path === args[1]);
          if (existing) {
            term.writeln(`File already exists: ${args[1]}`);
          } else {
            const ext = args[1].split('.').pop() || 'txt';
            onCreateFile?.(args[1], '', ext);
            term.writeln(`\x1b[32m✓ Created ${args[1]}\x1b[0m`);
          }
          break;
        }

        case 'mkdir': {
          if (!args[1]) { term.writeln('\x1b[31mUsage: mkdir <dir>\x1b[0m'); break; }
          onCreateFile?.(`${args[1]}/.gitkeep`, '', 'txt');
          term.writeln(`\x1b[32m✓ Created directory ${args[1]}/\x1b[0m`);
          break;
        }

        case 'rm': {
          if (!args[1]) { term.writeln('\x1b[31mUsage: rm <file>\x1b[0m'); break; }
          const flag = args[1] === '-rf' || args[1] === '-r';
          const target = flag ? args[2] : args[1];
          if (!target) { term.writeln('\x1b[31mUsage: rm [-rf] <file|dir>\x1b[0m'); break; }
          
          const toDelete = getFiles().filter(f => 
            f.file_path === target || (flag && f.file_path.startsWith(target + '/'))
          );
          
          if (toDelete.length === 0) {
            term.writeln(`\x1b[31mrm: ${target}: No such file or directory\x1b[0m`);
          } else {
            toDelete.forEach(f => onDeleteFile?.(f.file_path));
            term.writeln(`\x1b[33m⚠ Removed ${toDelete.length} item(s)\x1b[0m`);
          }
          break;
        }

        case 'tree': {
          term.writeln('\x1b[36m.\x1b[0m');
          const allFiles = getFiles().map(f => f.file_path).sort();
          const printed = new Set<string>();
          
          allFiles.forEach(fp => {
            const parts = fp.split('/');
            for (let i = 0; i < parts.length; i++) {
              const key = parts.slice(0, i + 1).join('/');
              if (!printed.has(key)) {
                printed.add(key);
                const indent = '│   '.repeat(i) + '├── ';
                const isDir = i < parts.length - 1;
                term.writeln(indent + (isDir ? `\x1b[34m${parts[i]}/\x1b[0m` : parts[i]));
              }
            }
          });
          term.writeln(`\n${allFiles.length} files`);
          break;
        }

        case 'pwd':
          term.writeln(`/home/dev/workspace/${projectName}`);
          break;

        case 'echo':
          term.writeln(args.slice(1).join(' '));
          break;

        case 'date':
          term.writeln(new Date().toString());
          break;

        case 'whoami':
          term.writeln('developer@bulbai');
          break;

        case 'git': {
          const sub = args[1];
          if (sub === 'status') {
            term.writeln('On branch \x1b[32mmain\x1b[0m');
            const staged = Array.from(stagedRef.current);
            const unstaged = getFiles().map(f => f.file_path).filter(p => !stagedRef.current.has(p));
            
            if (staged.length) {
              term.writeln('\nChanges to be committed:');
              staged.forEach(f => term.writeln(`  \x1b[32m  modified: ${f}\x1b[0m`));
            }
            if (unstaged.length) {
              term.writeln('\nChanges not staged:');
              unstaged.slice(0, 10).forEach(f => term.writeln(`  \x1b[31m  modified: ${f}\x1b[0m`));
              if (unstaged.length > 10) term.writeln(`  ... and ${unstaged.length - 10} more`);
            }
          } else if (sub === 'add') {
            const target = args[2];
            if (!target) { term.writeln('\x1b[31mUsage: git add <file|.>\x1b[0m'); break; }
            if (target === '.') {
              getFiles().forEach(f => stagedRef.current.add(f.file_path));
              term.writeln(`\x1b[32m✓ Staged all ${getFiles().length} files\x1b[0m`);
            } else {
              const exists = getFiles().find(f => f.file_path === target);
              if (exists) {
                stagedRef.current.add(target);
                term.writeln(`\x1b[32m✓ Staged ${target}\x1b[0m`);
              } else {
                term.writeln(`\x1b[31mfatal: pathspec '${target}' did not match\x1b[0m`);
              }
            }
          } else if (sub === 'commit') {
            if (args[2] !== '-m' || !args[3]) {
              term.writeln('\x1b[31mUsage: git commit -m "message"\x1b[0m');
              break;
            }
            const msg = args.slice(3).join(' ');
            if (stagedRef.current.size === 0) {
              term.writeln('\x1b[31mnothing to commit, working tree clean\x1b[0m');
            } else {
              const count = stagedRef.current.size;
              onCommit?.(msg);
              stagedRef.current.clear();
              term.writeln(`\x1b[32m[main ${Math.random().toString(36).slice(2, 9)}] ${msg}\x1b[0m`);
              term.writeln(` ${count} file(s) changed`);
            }
          } else if (sub === 'log') {
            term.writeln('\x1b[33mcommit ' + Math.random().toString(36).slice(2, 9) + '\x1b[0m (HEAD -> main)');
            term.writeln('Author: developer <dev@bulbai.app>');
            term.writeln('Date:   ' + new Date().toLocaleDateString());
            term.writeln('\n    Latest changes\n');
          } else if (sub === 'diff') {
            if (getFiles().length === 0) {
              term.writeln('No changes');
            } else {
              const f = getFiles()[0];
              term.writeln(`\x1b[36mdiff --git a/${f.file_path} b/${f.file_path}\x1b[0m`);
              term.writeln(`--- a/${f.file_path}`);
              term.writeln(`+++ b/${f.file_path}`);
              const lines = (f.file_content || '').split('\n').slice(0, 5);
              lines.forEach(l => term.writeln(`\x1b[32m+ ${l}\x1b[0m`));
            }
          } else {
            term.writeln('git <status|add|commit|log|diff>');
          }
          break;
        }

        case 'npm':
          if (args[1] === 'install' || args[1] === 'i') {
            term.writeln('\x1b[36m⠋ Installing packages...\x1b[0m');
            setTimeout(() => { term.writeln('\x1b[32m✓ Packages installed\x1b[0m'); prompt(); }, 800);
            return;
          } else if (args[1] === 'run') {
            term.writeln(`\x1b[36m⠋ Running ${args[2] || 'dev'}...\x1b[0m`);
          } else {
            term.writeln('npm <install|run> [script]');
          }
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
          term.writeln('   \x1b[33mShell:\x1b[0m Smart Terminal');
          term.writeln('   \x1b[33mFiles:\x1b[0m ' + getFiles().length);
          term.writeln('   \x1b[33mProject:\x1b[0m ' + projectName);
          break;

        default:
          term.writeln(`\x1b[31m${main}: command not found\x1b[0m`);
          term.writeln('Type \x1b[33mhelp\x1b[0m for available commands');
      }
    };

    term.onData((data) => {
      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        term.write('\r\n');
        if (command.trim()) {
          cmdHistoryRef.current.push(command.trim());
          historyIdxRef.current = cmdHistoryRef.current.length;
          exec(command.trim());
        }
        command = '';
        prompt();
      } else if (code === 127) { // Backspace
        if (command.length > 0) {
          command = command.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\x1b[A') { // Up arrow
        if (historyIdxRef.current > 0) {
          historyIdxRef.current--;
          const prev = cmdHistoryRef.current[historyIdxRef.current];
          // Clear current line
          term.write('\r\x1b[K');
          prompt();
          command = prev;
          term.write(prev);
        }
      } else if (data === '\x1b[B') { // Down arrow
        if (historyIdxRef.current < cmdHistoryRef.current.length - 1) {
          historyIdxRef.current++;
          const next = cmdHistoryRef.current[historyIdxRef.current];
          term.write('\r\x1b[K');
          prompt();
          command = next;
          term.write(next);
        } else {
          historyIdxRef.current = cmdHistoryRef.current.length;
          term.write('\r\x1b[K');
          prompt();
          command = '';
        }
      } else if (code === 9) { // Tab - autocomplete
        const matches = getFiles().filter(f => f.file_path.startsWith(command.split(' ').pop() || ''));
        if (matches.length === 1) {
          const parts = command.split(' ');
          const completion = matches[0].file_path;
          const toAdd = completion.slice((parts.pop() || '').length);
          command += toAdd;
          term.write(toAdd);
        } else if (matches.length > 1) {
          term.write('\r\n');
          matches.slice(0, 10).forEach(m => term.writeln('  ' + m.file_path));
          prompt();
          term.write(command);
        }
      } else if (code >= 32) {
        command += data;
        term.write(data);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-sm font-medium">Smart Terminal</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => xtermRef.current?.clear()} className="h-7 w-7 p-0">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}

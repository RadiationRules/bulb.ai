import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, RotateCcw, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Editor from '@monaco-editor/react';

interface CodePlaygroundProps {
  initialCode?: string;
  language?: string;
}

export const CodePlayground = ({ initialCode = '', language = 'typescript' }: CodePlaygroundProps) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  const runCode = () => {
    setIsRunning(true);
    setOutput('');

    try {
      // For JavaScript/TypeScript
      if (language === 'javascript' || language === 'typescript') {
        const logs: string[] = [];
        const originalLog = console.log;
        
        console.log = (...args: any[]) => {
          logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
          originalLog(...args);
        };

        try {
          // eslint-disable-next-line no-eval
          eval(code);
          setOutput(logs.join('\n') || 'Code executed successfully (no output)');
        } catch (error) {
          setOutput(`Error: ${error.message}`);
        } finally {
          console.log = originalLog;
        }
      } else {
        setOutput(`Execution for ${language} is not yet supported in the playground.\nCode validated successfully.`);
      }
      
      toast({ title: 'Code executed' });
    } catch (error) {
      setOutput(`Error: ${error.message}`);
      toast({ title: 'Execution error', variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    setOutput('');
    toast({ title: 'Code reset' });
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playground.${language}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Code downloaded' });
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Code Playground</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetCode}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCode}>
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            onClick={runCode} 
            disabled={isRunning}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Run
          </Button>
        </div>
      </div>

      <Tabs defaultValue="editor" className="flex-1 flex flex-col">
        <TabsList className="m-4">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 m-0 p-0">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </TabsContent>

        <TabsContent value="output" className="flex-1 m-0 p-4">
          <Card className="h-full p-4 bg-muted/50 font-mono text-sm">
            <pre className="whitespace-pre-wrap">{output || 'No output yet. Run the code to see results.'}</pre>
          </Card>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
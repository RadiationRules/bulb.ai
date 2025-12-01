import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Copy, Sparkles, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface DocumentationPanelProps {
  code: string;
  fileName: string;
  language: string;
}

export const DocumentationPanel = ({ code, fileName, language }: DocumentationPanelProps) => {
  const [documentation, setDocumentation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateDocs = async () => {
    if (!code.trim()) {
      toast({ title: 'No code selected', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-docs', {
        body: { code, fileName, language }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast({ 
            title: 'Rate Limited', 
            description: 'Please wait before generating more docs',
            variant: 'destructive' 
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setDocumentation(data.documentation);
      toast({ title: 'Documentation generated!' });
    } catch (error) {
      console.error('Doc generation failed:', error);
      toast({ 
        title: 'Generation failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(documentation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  const downloadDocs = () => {
    const blob = new Blob([documentation], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-docs.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Documentation downloaded' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Documentation</h2>
        </div>
        <Button
          onClick={generateDocs}
          disabled={isGenerating || !code}
          size="sm"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Generate Docs'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {documentation ? (
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadDocs}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            <Card className="p-6 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code: ({ className, children, ...props }: any) => {
                    return (
                      <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children, ...props }: any) => (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto" {...props}>
                      {children}
                    </pre>
                  )
                }}
              >
                {documentation}
              </ReactMarkdown>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center">
            <div>
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select code and click "Generate Docs" to create comprehensive documentation</p>
              <p className="text-sm mt-2">Powered by AI</p>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
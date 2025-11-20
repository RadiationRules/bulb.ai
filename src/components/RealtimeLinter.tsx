import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface LintIssue {
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule: string;
  fix?: string;
}

interface RealtimeLinterProps {
  code: string;
  language: string;
  onIssuesChange: (issues: LintIssue[]) => void;
}

export const RealtimeLinter = ({ code, language, onIssuesChange }: RealtimeLinterProps) => {
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const analyzeCode = async () => {
      if (!code.trim()) {
        setIssues([]);
        onIssuesChange([]);
        return;
      }

      setIsAnalyzing(true);
      try {
        const { data, error } = await supabase.functions.invoke('lint-code', {
          body: { code, language }
        });

        if (error) throw error;
        
        const newIssues = data.issues || [];
        setIssues(newIssues);
        onIssuesChange(newIssues);
      } catch (error) {
        console.error('Linting error:', error);
        setIssues([]);
        onIssuesChange([]);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const debounce = setTimeout(analyzeCode, 500);
    return () => clearTimeout(debounce);
  }, [code, language, onIssuesChange]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-l-red-500 bg-red-500/10';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/10';
      default:
        return 'border-l-blue-500 bg-blue-500/10';
    }
  };

  if (issues.length === 0 && !isAnalyzing) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 max-h-48 overflow-y-auto bg-background border-t border-border">
      <div className="p-2 bg-muted/50 flex items-center justify-between text-xs">
        <span className="font-medium">
          {isAnalyzing ? 'Analyzing...' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} found`}
        </span>
        <div className="flex gap-2">
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-500" />
            {issues.filter(i => i.severity === 'error').length}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            {issues.filter(i => i.severity === 'warning').length}
          </span>
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3 text-blue-500" />
            {issues.filter(i => i.severity === 'info').length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {issues.map((issue, index) => (
          <div
            key={index}
            className={cn(
              "p-2 border-l-2 hover:bg-accent/50 cursor-pointer transition-colors",
              getSeverityColor(issue.severity)
            )}
          >
            <div className="flex items-start gap-2">
              {getSeverityIcon(issue.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Line {issue.line}:{issue.column}</span>
                  <span className="text-muted-foreground">{issue.rule}</span>
                </div>
                <div className="text-sm mt-1">{issue.message}</div>
                {issue.fix && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Fix: {issue.fix}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
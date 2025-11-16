import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  Sparkles, 
  Loader2,
  Bug,
  Shield,
  Zap,
  Code2,
  Eye
} from 'lucide-react';

interface CodeIssue {
  type: 'bug' | 'security' | 'performance' | 'style' | 'accessibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number | null;
  title: string;
  description: string;
  suggestion: string;
  code?: string;
}

interface CodeReview {
  overall: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  issues: CodeIssue[];
  strengths: string[];
  score: number;
}

interface CodeReviewPanelProps {
  fileName: string;
  fileContent: string;
  language: string;
}

const severityColors = {
  low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  critical: 'text-red-500 bg-red-500/10 border-red-500/20',
};

const severityIcons = {
  low: CheckCircle2,
  medium: AlertTriangle,
  high: AlertCircle,
  critical: XCircle,
};

const typeIcons = {
  bug: Bug,
  security: Shield,
  performance: Zap,
  style: Code2,
  accessibility: Eye,
};

export const CodeReviewPanel = ({ fileName, fileContent, language }: CodeReviewPanelProps) => {
  const [review, setReview] = useState<CodeReview | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const { toast } = useToast();

  const handleReview = async () => {
    if (!fileContent.trim()) {
      toast({
        title: "No code to review",
        description: "Please select a file with content first.",
        variant: "destructive",
      });
      return;
    }

    setIsReviewing(true);
    setReview(null);

    try {
      const { data, error } = await supabase.functions.invoke('code-review', {
        body: { code: fileContent, fileName, language }
      });

      if (error) {
        if (error.message?.includes('Rate limits exceeded')) {
          toast({
            title: "Rate limit reached",
            description: "Please wait a moment before reviewing again.",
            variant: "destructive",
          });
        } else if (error.message?.includes('Payment required')) {
          toast({
            title: "Credits required",
            description: "Please add credits to your workspace to continue.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setReview(data);
      
      toast({
        title: "Review complete",
        description: `Found ${data.issues.length} issue${data.issues.length !== 1 ? 's' : ''}. Code quality score: ${data.score}/100`,
      });
    } catch (error: any) {
      console.error('Code review error:', error);
      toast({
        title: "Review failed",
        description: error.message || "Failed to complete code review",
        variant: "destructive",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const SeverityIcon = review ? severityIcons[review.severity] : CheckCircle2;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Code Review</h3>
        </div>
        <Button 
          onClick={handleReview} 
          disabled={isReviewing || !fileContent.trim()}
          size="sm"
        >
          {isReviewing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Reviewing...
            </>
          ) : (
            'Review Code'
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {!review && !isReviewing && (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm">
                  Click "Review Code" to analyze {fileName || 'the current file'} for bugs, security issues, performance problems, and best practices.
                </p>
              </CardContent>
            </Card>
          )}

          {isReviewing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing code...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {review && (
            <>
              {/* Score Card */}
              <Card className={severityColors[review.severity]}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityIcon className="w-5 h-5" />
                      <span>Quality Score: {review.score}/100</span>
                    </div>
                    <Badge variant="outline" className={severityColors[review.severity]}>
                      {review.severity.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{review.overall}</p>
                </CardContent>
              </Card>

              {/* Strengths */}
              {review.strengths.length > 0 && (
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {review.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Issues */}
              {review.issues.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Issues Found ({review.issues.length})</h4>
                  {review.issues.map((issue, idx) => {
                    const TypeIcon = typeIcons[issue.type];
                    return (
                      <Card key={idx} className={severityColors[issue.severity]}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <TypeIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{issue.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {issue.type}
                                  </Badge>
                                  {issue.line && (
                                    <Badge variant="outline" className="text-xs">
                                      Line {issue.line}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{issue.description}</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          <div>
                            <p className="text-xs font-semibold mb-1">Suggestion:</p>
                            <p className="text-xs">{issue.suggestion}</p>
                          </div>
                          {issue.code && (
                            <div>
                              <p className="text-xs font-semibold mb-1">Example fix:</p>
                              <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                                <code>{issue.code}</code>
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-sm font-semibold text-green-500">No issues found!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your code looks great.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

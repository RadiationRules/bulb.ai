import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Copy, Mail, Twitter, Linkedin, Facebook, Link2, 
  Check, QrCode, Code2, Globe, Lock, Users
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectUrl: string;
  projectName: string;
  isPublic?: boolean;
}

export const ShareDialog = ({ 
  open, 
  onOpenChange, 
  projectUrl, 
  projectName,
  isPublic = true 
}: ShareDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [showQR, setShowQR] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "The project URL has been copied to your clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out ${projectName} on BulbAI`);
    const body = encodeURIComponent(`Hey! I wanted to share this project with you:\n\n${projectName}\n${projectUrl}\n\nBuilt with BulbAI - AI-powered coding platform.`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    toast({ title: "Email opened", description: "Share email has been prepared." });
  };

  const handleSocialShare = (platform: string) => {
    const text = encodeURIComponent(`Check out ${projectName} - built with BulbAI! 🚀`);
    const url = encodeURIComponent(projectUrl);
    
    const links: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };

    window.open(links[platform], '_blank', 'width=600,height=400');
  };

  const embedCode = `<iframe src="${projectUrl}" width="100%" height="500" frameborder="0"></iframe>`;

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode);
    toast({ title: "Embed code copied!" });
  };

  // Generate QR code using API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(projectUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-tech-blue" />
            Share {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visibility Status */}
          <Card className="p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <>
                    <Globe className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Public project</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Private project</span>
                  </>
                )}
              </div>
              <Badge variant={isPublic ? "default" : "secondary"}>
                {isPublic ? "Anyone can view" : "Invite only"}
              </Badge>
            </div>
          </Card>

          {/* Copy Link */}
          <div className="space-y-2">
            <Label>Project Link</Label>
            <div className="flex gap-2">
              <Input 
                value={projectUrl} 
                readOnly 
                className="font-mono text-sm bg-muted/50"
              />
              <Button onClick={handleCopy} variant="outline" className="shrink-0 gap-2">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Email Share */}
          <div className="space-y-2">
            <Label>Share via Email</Label>
            <div className="flex gap-2">
              <Input 
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button 
                onClick={handleEmailShare} 
                variant="outline" 
                className="shrink-0 gap-2"
                disabled={!email}
              >
                <Mail className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>

          <Separator />

          {/* Social Sharing */}
          <div className="space-y-3">
            <Label>Share on Social</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleSocialShare('twitter')}
                className="flex-1 h-11 hover:bg-[#1DA1F2]/10 hover:border-[#1DA1F2]/50 hover:text-[#1DA1F2]"
              >
                <Twitter className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleSocialShare('linkedin')}
                className="flex-1 h-11 hover:bg-[#0077B5]/10 hover:border-[#0077B5]/50 hover:text-[#0077B5]"
              >
                <Linkedin className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleSocialShare('facebook')}
                className="flex-1 h-11 hover:bg-[#1877F2]/10 hover:border-[#1877F2]/50 hover:text-[#1877F2]"
              >
                <Facebook className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* QR Code & Embed */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => setShowQR(!showQR)}
              className="gap-2"
            >
              <QrCode className="h-4 w-4" />
              QR Code
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyEmbed}
              className="gap-2"
            >
              <Code2 className="h-4 w-4" />
              Embed Code
            </Button>
          </div>

          {/* QR Code Display */}
          {showQR && (
            <Card className="p-4 flex items-center justify-center bg-white">
              <img 
                src={qrUrl} 
                alt="QR Code" 
                className="w-40 h-40"
              />
            </Card>
          )}

          {/* Invite Collaborators */}
          <Card className="p-4 bg-gradient-to-r from-tech-blue/10 to-tech-purple/10 border-tech-blue/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-tech-blue/20">
                <Users className="h-5 w-5 text-tech-blue" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Invite Collaborators</p>
                <p className="text-xs text-muted-foreground">
                  Work together in real-time
                </p>
              </div>
              <Button variant="outline" size="sm">
                Invite
              </Button>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
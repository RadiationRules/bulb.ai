import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Layout, 
  ShoppingCart, 
  MessageSquare, 
  BarChart3, 
  Gamepad2, 
  Camera, 
  Music, 
  BookOpen,
  Rocket,
  Sparkles,
  Code,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tags: string[];
  files: Record<string, string>;
  popular?: boolean;
}

const templates: Template[] = [
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Beautiful, responsive landing page with hero section, features, and CTA',
    icon: Layout,
    color: 'from-blue-500 to-cyan-500',
    tags: ['Marketing', 'Responsive'],
    popular: true,
    files: {
      'src/App.tsx': `import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Welcome to Your App
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Build something amazing with this starter template. Fast, responsive, and ready to customize.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">Learn More</Button>
        </div>
      </header>
      
      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {['Fast', 'Secure', 'Scalable'].map((feature) => (
            <div key={feature} className="p-6 rounded-xl bg-card border">
              <h3 className="text-xl font-semibold mb-2">{feature}</h3>
              <p className="text-muted-foreground">Lorem ipsum dolor sit amet consectetur.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}`
    }
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Product catalog with cart, checkout flow, and payment integration',
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-500',
    tags: ['Store', 'Payments'],
    popular: true,
    files: {
      'src/App.tsx': `import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';

const products = [
  { id: 1, name: 'Product 1', price: 29.99, image: '🎨' },
  { id: 2, name: 'Product 2', price: 49.99, image: '🎧' },
  { id: 3, name: 'Product 3', price: 19.99, image: '📱' },
  { id: 4, name: 'Product 4', price: 99.99, image: '💻' },
];

export default function App() {
  const [cart, setCart] = useState<number[]>([]);
  
  const addToCart = (id: number) => setCart([...cart, id]);
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">MyStore</h1>
          <Button variant="outline" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <Badge>{cart.length}</Badge>
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardHeader className="text-center text-6xl py-8 bg-muted">
                {product.image}
              </CardHeader>
              <CardContent className="pt-4">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <p className="text-2xl font-bold text-primary">\${product.price}</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => addToCart(product.id)}>
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}`
    }
  },
  {
    id: 'chat-app',
    name: 'Chat Application',
    description: 'Real-time messaging with AI integration and user presence',
    icon: MessageSquare,
    color: 'from-purple-500 to-pink-500',
    tags: ['AI', 'Real-time'],
    files: {
      'src/App.tsx': `import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';

interface Message { id: number; text: string; sender: 'user' | 'bot'; }

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Hello! How can I help you today?', sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  
  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), text: input, sender: 'user' }]);
    setInput('');
    // Add bot response
    setTimeout(() => {
      setMessages(m => [...m, { id: Date.now(), text: 'Thanks for your message!', sender: 'bot' }]);
    }, 1000);
  };
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b p-4">
        <h1 className="text-xl font-bold">Chat App</h1>
      </header>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={\`flex \${msg.sender === 'user' ? 'justify-end' : 'justify-start'}\`}>
              <div className={\`max-w-[70%] p-3 rounded-lg \${
                msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }\`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="border-t p-4">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button onClick={sendMessage}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}`
    }
  },
  {
    id: 'dashboard',
    name: 'Analytics Dashboard',
    description: 'Data visualization with charts, metrics, and real-time updates',
    icon: BarChart3,
    color: 'from-orange-500 to-red-500',
    tags: ['Charts', 'Data'],
    popular: true,
    files: {
      'src/App.tsx': `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, DollarSign, Activity } from 'lucide-react';

const stats = [
  { title: 'Total Revenue', value: '$45,231', change: '+20.1%', icon: DollarSign },
  { title: 'Active Users', value: '2,350', change: '+15%', icon: Users },
  { title: 'Sales', value: '+12,234', change: '+19%', icon: BarChart3 },
  { title: 'Active Now', value: '573', change: '+201', icon: Activity },
];

export default function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-500">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-end justify-around gap-2">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
              <div 
                key={i}
                className="bg-primary/80 rounded-t w-full max-w-[40px] transition-all hover:bg-primary"
                style={{ height: \`\${h}%\` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}`
    }
  },
  {
    id: 'game',
    name: 'Mini Game',
    description: 'Interactive browser game with animations and score tracking',
    icon: Gamepad2,
    color: 'from-yellow-500 to-orange-500',
    tags: ['Fun', 'Interactive'],
    files: {
      'src/App.tsx': `import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function App() {
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  
  useEffect(() => {
    if (!gameActive || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);
  
  const handleClick = () => {
    if (!gameActive) return;
    setScore(s => s + 1);
    setTarget({ x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
  };
  
  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
  };
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>🎯 Click Game</span>
            <span>Score: {score}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!gameActive ? (
            <div className="text-center py-8">
              <p className="text-xl mb-4">Click the target as fast as you can!</p>
              <Button size="lg" onClick={startGame}>Start Game</Button>
            </div>
          ) : timeLeft <= 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl font-bold mb-4">Game Over!</p>
              <p className="text-xl mb-4">Final Score: {score}</p>
              <Button size="lg" onClick={startGame}>Play Again</Button>
            </div>
          ) : (
            <div className="relative h-[300px] bg-muted rounded-lg overflow-hidden">
              <div className="absolute top-2 right-2 text-2xl font-bold">{timeLeft}s</div>
              <button
                onClick={handleClick}
                className="absolute w-12 h-12 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform cursor-pointer animate-pulse"
                style={{ left: \`\${target.x}%\`, top: \`\${target.y}%\` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}`
    }
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Personal portfolio with projects showcase and contact form',
    icon: Camera,
    color: 'from-indigo-500 to-purple-500',
    tags: ['Personal', 'Showcase'],
    files: {
      'src/App.tsx': `import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Linkedin, Mail } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 mx-auto mb-6 flex items-center justify-center text-4xl">
          👨‍💻
        </div>
        <h1 className="text-4xl font-bold mb-4">John Developer</h1>
        <p className="text-xl text-muted-foreground mb-6">Full-Stack Developer</p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" size="icon"><Github className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon"><Linkedin className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon"><Mail className="h-4 w-4" /></Button>
        </div>
      </header>
      
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Projects</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {['Project 1', 'Project 2', 'Project 3'].map((project) => (
            <Card key={project}>
              <CardHeader>
                <div className="h-32 bg-muted rounded-lg mb-4" />
                <CardTitle>{project}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">A brief description of this amazing project.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}`
    }
  },
  {
    id: 'music-player',
    name: 'Music Player',
    description: 'Audio player with playlist, controls, and visualizations',
    icon: Music,
    color: 'from-pink-500 to-rose-500',
    tags: ['Audio', 'UI'],
    files: {
      'src/App.tsx': `import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

const songs = [
  { id: 1, title: 'Summer Vibes', artist: 'DJ Cool', duration: '3:45' },
  { id: 2, title: 'Night Drive', artist: 'Synthwave', duration: '4:20' },
  { id: 3, title: 'Morning Coffee', artist: 'Lo-Fi Beats', duration: '2:58' },
];

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(songs[0]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl p-6 shadow-xl">
        <div className="w-48 h-48 mx-auto mb-6 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-6xl">
          🎵
        </div>
        
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">{current.title}</h2>
          <p className="text-muted-foreground">{current.artist}</p>
        </div>
        
        <Slider defaultValue={[33]} className="mb-6" />
        
        <div className="flex justify-center items-center gap-4 mb-8">
          <Button variant="ghost" size="icon"><SkipBack /></Button>
          <Button size="lg" className="rounded-full w-14 h-14" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button variant="ghost" size="icon"><SkipForward /></Button>
        </div>
        
        <div className="space-y-2">
          {songs.map((song) => (
            <button
              key={song.id}
              onClick={() => setCurrent(song)}
              className={\`w-full p-3 rounded-lg flex justify-between items-center transition-colors \${
                current.id === song.id ? 'bg-primary/20' : 'hover:bg-muted'
              }\`}
            >
              <div className="text-left">
                <p className="font-medium">{song.title}</p>
                <p className="text-sm text-muted-foreground">{song.artist}</p>
              </div>
              <span className="text-sm text-muted-foreground">{song.duration}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}`
    }
  },
  {
    id: 'blog',
    name: 'Blog / CMS',
    description: 'Content management with articles, categories, and search',
    icon: BookOpen,
    color: 'from-teal-500 to-green-500',
    tags: ['Content', 'SEO'],
    files: {
      'src/App.tsx': `import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

const posts = [
  { id: 1, title: 'Getting Started with React', category: 'Tutorial', date: 'Dec 20, 2024' },
  { id: 2, title: '10 Tips for Better Code', category: 'Tips', date: 'Dec 18, 2024' },
  { id: 3, title: 'Building Your First API', category: 'Backend', date: 'Dec 15, 2024' },
];

export default function App() {
  const [search, setSearch] = useState('');
  const filtered = posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-4">My Blog</h1>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search posts..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {filtered.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{post.category}</Badge>
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                </div>
                <CardTitle className="text-xl">{post.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}`
    }
  }
];

export function ProjectTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreateProject = async () => {
    if (!selectedTemplate || !projectName.trim() || !user) return;
    
    setCreating(true);
    try {
      // Get profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create project
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          title: projectName,
          description: selectedTemplate.description,
          owner_id: profile.id,
          tags: selectedTemplate.tags,
          file_structure: { files: Object.keys(selectedTemplate.files) }
        })
        .select()
        .single();

      if (error) throw error;

      // Create project files
      const fileInserts = Object.entries(selectedTemplate.files).map(([path, content]) => ({
        project_id: project.id,
        file_path: path,
        file_content: content,
        file_type: path.endsWith('.tsx') ? 'tsx' : path.endsWith('.ts') ? 'ts' : 'text'
      }));

      await supabase.from('project_files').insert(fileInserts);

      toast({
        title: "Project created!",
        description: `${projectName} is ready to go.`,
      });

      setSelectedTemplate(null);
      setProjectName('');
      navigate(`/workspace/${project.id}`);
    } catch (error) {
      toast({
        title: "Failed to create project",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          Start with a Template
        </h2>
        <p className="text-muted-foreground">Choose a pre-built starter to jumpstart your project</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template, index) => (
          <Card 
            key={template.id}
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 group animate-fade-in`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => {
              if (!user) {
                navigate('/auth');
                return;
              }
              setSelectedTemplate(template);
              setProjectName(template.name);
            }}
          >
            <CardHeader className="pb-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <template.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.popular && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    <Rocket className="w-3 h-3 mr-0.5" />
                    Popular
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-xs line-clamp-2 mb-3">
                {template.description}
              </CardDescription>
              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create from scratch */}
      <Card 
        className="border-dashed border-2 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
        onClick={() => {
          if (!user) {
            navigate('/auth');
            return;
          }
          navigate('/dashboard');
        }}
      >
        <CardContent className="flex items-center justify-center py-8 gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Code className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Start from Scratch</p>
            <p className="text-sm text-muted-foreground">Create an empty project</p>
          </div>
          <Zap className="h-5 w-5 text-primary ml-4" />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTemplate && (
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedTemplate.color} flex items-center justify-center`}>
                  {selectedTemplate && <selectedTemplate.icon className="h-5 w-5 text-white" />}
                </div>
              )}
              Create from {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Give your new project a name to get started
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Awesome Project"
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={!projectName.trim() || creating}
              className="gap-2"
            >
              {creating ? (
                <>Creating...</>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

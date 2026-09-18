import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BulbIcon } from '@/components/BulbIcon';
import { Search as SearchIcon, ExternalLink, Star, GitFork, ArrowLeft } from 'lucide-react';

interface SearchProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  stars_count: number;
  forks_count: number;
  preview_url: string | null;
  preview_image: string | null;
  created_at: string;
  owner: string;
}

export default function Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [input, setInput] = useState(query);
  const [projects, setProjects] = useState<SearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(params.get('tag'));

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    document.title = query
      ? `Search "${query}" — BulbAI community projects`
      : 'Search community projects — BulbAI';
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, title, description, tags, stars_count, forks_count,
          preview_url, preview_image, created_at,
          profiles!projects_owner_id_fkey ( username, display_name )
        `)
        .eq('visibility', 'public')
        .order('stars_count', { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (error) {
        console.error('Search load error:', error);
        setProjects([]);
      } else {
        setProjects(
          (data ?? []).map((p: any) => ({
            id: p.id,
            title: p.title ?? 'Untitled project',
            description: p.description ?? '',
            tags: p.tags ?? [],
            stars_count: p.stars_count ?? 0,
            forks_count: p.forks_count ?? 0,
            preview_url: p.preview_url ?? null,
            preview_image: p.preview_image ?? null,
            created_at: p.created_at,
            owner: p.profiles?.display_name || p.profiles?.username || 'A builder',
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [projects]);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return projects
      .filter((p) => (activeTag ? p.tags.includes(activeTag) : true))
      .map((p) => {
        const haystackTitle = p.title.toLowerCase();
        const haystackTags = p.tags.join(' ').toLowerCase();
        const haystackDesc = p.description.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (haystackTitle.includes(term)) score += 10;
          if (haystackTags.includes(term)) score += 6;
          if (haystackDesc.includes(term)) score += 2;
        }
        return { project: p, score };
      })
      .filter((r) => (terms.length ? r.score > 0 : true))
      .sort((a, b) => b.score - a.score || b.project.stars_count - a.project.stars_count)
      .map((r) => r.project);
  }, [projects, query, activeTag]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (input.trim()) next.set('q', input.trim());
    if (activeTag) next.set('tag', activeTag);
    setParams(next);
  };

  const toggleTag = (tag: string) => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (activeTag !== tag) next.set('tag', tag);
    setActiveTag(activeTag === tag ? null : tag);
    setParams(next);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
          <div className="flex items-center gap-2">
            <BulbIcon className="w-7 h-7" animated />
            <span className="font-bold">BulbAI Search</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Find community projects</h1>
        <p className="text-muted-foreground mb-6">
          Search every public BulbAI project by title, tag or description.
        </p>

        <form onSubmit={submit} className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try 'portfolio', 'game', 'dashboard'..."
              className="pl-9 h-11"
              autoFocus
            />
          </div>
          <Button type="submit" className="h-11 px-6">Search</Button>
        </form>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {allTags.map(([tag, count]) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}>
                <Badge
                  variant={activeTag === tag ? 'default' : 'secondary'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {tag} <span className="ml-1 opacity-60">{count}</span>
                </Badge>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center">
            <BulbIcon className="w-10 h-10 mx-auto animate-pulse" />
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            No projects match {query ? `"${query}"` : 'that filter'} yet.
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} project{results.length === 1 ? '' : 's'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((p) => (
                <article
                  key={p.id}
                  className="rounded-xl border border-border bg-card/60 p-4 hover:border-primary/50 transition-colors animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold truncate">{p.title}</h2>
                      <p className="text-xs text-muted-foreground">by {p.owner}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{p.stars_count}</span>
                      <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{p.forks_count}</span>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                  )}
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.tags.slice(0, 5).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    {p.preview_url ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={p.preview_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" /> Live preview
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>Not live yet</Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

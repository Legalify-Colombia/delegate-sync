import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Newspaper, Search, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NewsPublication {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  status: string;
  created_at: string;
  committee_id: string | null;
  committees?: { name: string };
  author: { full_name: string };
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsPublication[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsPublication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('news_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'news_publications'
        },
        () => {
          fetchNews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const filtered = news.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.author.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNews(filtered);
  }, [news, searchTerm]);

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news_publications')
      .select(`
        *,
        committees (name),
        author:profiles!news_publications_author_id_fkey (full_name)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error) {
      setNews((data as any) || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando noticias...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center space-x-2">
            <Newspaper className="h-8 w-8" />
            <span>Noticias del Evento</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Mantente informado con las últimas noticias y actualizaciones de los comités y actividades del Model United Nations
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Search className="h-5 w-5" />
              <Input
                placeholder="Buscar noticias por título, contenido o autor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardHeader>
        </Card>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.length > 0 ? (
            filteredNews.map((article) => (
              <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {article.cover_image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={article.cover_image_url}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                    {article.committees && (
                      <Badge variant="secondary" className="ml-2 flex-shrink-0">
                        {article.committees.name}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-3">
                    {article.content}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{article.author.full_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(article.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Newspaper className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No se encontraron noticias' : 'No hay noticias disponibles'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Las noticias aparecerán aquí cuando sean publicadas'
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
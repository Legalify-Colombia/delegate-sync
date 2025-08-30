import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Scale, User, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function NewsDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [author, setAuthor] = useState<{ full_name: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    const [committee, setCommittee] = useState(null);

  useEffect(() => {
    async function fetchArticle() {
      setLoading(true);
      const { data, error } = await supabase
  .from('news_publications')
  .select('id, title, content, cover_image_url, created_at, status, author_id, committee_id')
  .eq('id', id)
  .eq('status', 'approved')
  .single();
      if (error) {
        setError('No se pudo cargar la noticia.');
      } else {
        setArticle(data);
        // Consulta adicional para el autor
        if (data?.committee_id) {
          const { data: committeeData } = await supabase
            .from('committees')
            .select('name')
            .eq('id', data.committee_id)
            .single();
          setCommittee(committeeData ?? null);
        }
        if (data?.author_id) {
          console.log('author_id:', data.author_id);
          const { data: authorData, error: authorError, status, statusText } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.author_id.toString())
            .single();
          console.log('authorData:', authorData);
          console.log('authorError:', authorError);
          console.log('status:', status, 'statusText:', statusText);
          if (authorData) {
            setAuthor(authorData);
          } else {
            setAuthor(null);
          }
        }
      }
      setLoading(false);
    }
    fetchArticle();
  }, [id]);

  console.log('article:', article);
  console.log('author:', author);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando noticia...</div>;
  }
  if (error || !article) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">{error || 'Noticia no encontrada.'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Scale className="text-blue-600" />
              <Link to="/" className="text-xl font-bold text-gray-900">The Resolution Hub</Link>
            </div>
            <div className="flex items-center space-x-2">
              {author?.avatar_url && (
                <img src={author.avatar_url} alt="Avatar" className="h-6 w-6 rounded-full" />
              )}
              <User className="h-4 w-4" />
              <span>{author?.full_name ?? 'Desconocido'}</span>
              <Link to="/news" className="text-blue-600 font-semibold">Noticias</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <img src={article.cover_image_url || 'https://placehold.co/800x400/e0e7ff/4338ca?text=Noticia'} alt={article.title} className="w-full h-80 object-cover" />
          <div className="p-8">
            <div className="flex items-center mb-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/news" className="flex items-center gap-2 text-blue-600">
                  <ArrowLeft className="h-4 w-4" /> Volver a noticias
                </Link>
              </Button>
            </div>
            <p className="text-sm font-semibold text-blue-600 mb-2">
              {committee?.name ? `Comité: ${committee.name}` : 'Comité no disponible'}
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>
            <div className="flex items-center text-sm text-gray-500 mb-6">
              <Avatar className="w-8 h-8 mr-3">
                <AvatarImage src={author?.avatar_url || ''} />
                <AvatarFallback>{author?.full_name ? author.full_name.charAt(0) : '?'}</AvatarFallback>
              </Avatar>
              <span>{author?.full_name ?? 'Desconocido'}</span>
              {(!author || !author.full_name) && (
                <span className="ml-2 text-xs text-red-500">author_id: {article.author_id || 'No disponible'}</span>
              )}
              <span className="mx-2">&middot;</span>
              <span>{new Date(article.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="prose max-w-none text-gray-800 text-lg" style={{ whiteSpace: 'pre-line' }}>
              <div className="text-justify">
                {article.content}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

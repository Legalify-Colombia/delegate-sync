import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Componentes UI - Asegúrate de tenerlos en tu proyecto
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Iconos
import { Search, Scale, Github, Twitter, Linkedin, LogOut, LayoutDashboard, X, User } from 'lucide-react';

// Interfaces
interface NewsPublication {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  created_at: string;
  committees?: { name: string };
  author: { full_name: string; avatar_url?: string };
}

// --- Componente Modal para las Noticias ---
const NewsModal = ({ article, onClose }: { article: NewsPublication; onClose: () => void }) => {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-[fade-in_0.3s_ease-out]"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-[scale-in_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors z-10"
        >
          <X size={24} />
        </button>
        <img src={article.cover_image_url || 'https://placehold.co/1200x600/e0e7ff/4338ca?text=Noticia'} alt={article.title} className="w-full h-64 object-cover rounded-t-xl" />
        <div className="p-8">
          <p className="text-sm font-semibold text-blue-600 mb-2">{article.committees?.name}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>
          <div className="flex items-center text-sm text-gray-500 mb-6 border-b pb-4">
            <Avatar className="w-10 h-10 mr-3">
              <AvatarImage src={article.author.avatar_url} />
              <AvatarFallback>{article.author.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <span className="font-semibold text-gray-800">{article.author.full_name}</span>
                <p>{new Date(article.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="prose max-w-none text-gray-700">
            <p>{article.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// Componente principal de la página de noticias
export default function NewsPage() {
  const { user, signOut } = useAuth();
  const [news, setNews] = useState<NewsPublication[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsPublication[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todas']);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsPublication | null>(null);

  useEffect(() => {
    fetchNews();
    const channel = supabase
      .channel('news_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_publications' }, () => fetchNews())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const results = news.filter(article => {
      const inCategory = activeCategory === 'Todas' || article.committees?.name === activeCategory;
      const inSearch = searchTerm === '' ||
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.author.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (article.committees?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return inCategory && inSearch;
    });
    setFilteredNews(results);
  }, [news, searchTerm, activeCategory]);
  
  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news_publications')
      .select('id, title, content, cover_image_url, created_at, status, committee_id, committees(name), author_id')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error) {
      const fetchedNews = (data as any) || [];
      setNews(fetchedNews);
      const uniqueCategories: string[] = ['Todas', ...Array.from(new Set(fetchedNews.map((n: any) => n.committees?.name).filter(Boolean))) as string[]];
      setCategories(uniqueCategories);
    }
    setLoading(false);
  };
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando noticias...</div>;
  }

  // Bloque temporal para depuración de datos Supabase
  // ...existing code...

  const featuredArticle = filteredNews.length > 0 ? filteredNews[0] : null;
  const otherArticles = filteredNews.length > 1 ? filteredNews.slice(1, 3) : [];

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* En lugar de usar <Header />, se integra el código directamente para hacerlo dinámico. Puedes mover esta lógica a tu componente Header si lo prefieres. */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Scale className="text-blue-600" />
                <a href="/" className="text-xl font-bold text-gray-900">The Resolution Hub</a>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{(user as any)?.email ?? 'Desconocido'}</span>
                <a href="/news" className="text-blue-600 font-semibold">Noticias</a>
                <a href="#" className="hover:text-blue-600 transition-colors">Precios</a>
              </div>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="" alt="Usuario" />
                        <AvatarFallback>{(user as any)?.email ? (user as any).email.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{(user as any)?.email || 'Usuario'}</p>
                        <p className="text-xs leading-none text-muted-foreground">Usuario</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = '/dashboard'}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <a href="/auth" className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-gray-300">
                  Iniciar Sesión
                </a>
              )}
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-left mb-12">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Noticias del Evento</h1>
              <p className="text-lg text-gray-600">Mantente al día con las últimas actualizaciones de nuestro Modelo de Naciones Unidas.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors whitespace-nowrap ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Buscar noticias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {featuredArticle && (
                <Link to={`/news/${featuredArticle.id}`} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer block">
                  <img src={featuredArticle.cover_image_url || 'https://placehold.co/800x400/e0e7ff/4338ca?text=Noticia'} alt={featuredArticle.title} className="w-full h-80 object-cover" />
                  <div className="p-6">
                    <p className="text-sm font-semibold text-blue-600 mb-2">{featuredArticle.committees?.name}</p>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">{featuredArticle.title}</h2>
                    <p className="text-gray-600 mb-4 line-clamp-2">{featuredArticle.content}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Avatar className="w-8 h-8 mr-3">
                        <AvatarImage src={featuredArticle.author?.avatar_url || ''} />
                        <AvatarFallback>{featuredArticle.author?.full_name ? featuredArticle.author.full_name.charAt(0) : '?'}</AvatarFallback>
                      </Avatar>
                      <span>{featuredArticle.author?.full_name ?? 'Desconocido'}</span>
                      <span className="mx-2">&middot;</span>
                      <span>{new Date(featuredArticle.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                </Link>
              )}
              <div className="lg:col-span-1 space-y-8">
                {otherArticles.map(article => (
                  <Link key={article.id} to={`/news/${article.id}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer block">
                    <img src={article.cover_image_url || 'https://placehold.co/600x400/dbeafe/312e81?text=Noticia'} alt={article.title} className="w-full h-48 object-cover" />
                    <div className="p-6">
                      <p className="text-sm font-semibold text-blue-600 mb-2">{article.committees?.name}</p>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">{article.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-4">
                        <Avatar className="w-8 h-8 mr-3">
                          <AvatarImage src={article.author?.avatar_url || ''} />
                          <AvatarFallback>{article.author?.full_name ? article.author.full_name.charAt(0) : '?'}</AvatarFallback>
                        </Avatar>
                        <span>{article.author?.full_name ?? 'Desconocido'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-gray-100 border-t border-gray-200">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1">
                <div className="flex items-center space-x-2 mb-4">
                  <Scale className="text-blue-600" />
                  <span className="text-lg font-bold text-gray-900">The Resolution Hub</span>
                </div>
                <p className="text-sm text-gray-600">Suscríbete para recibir noticias y actualizaciones.</p>
                <form className="mt-4 flex">
                  <input type="email" placeholder="Tu correo electrónico" className="w-full bg-white border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" className="bg-gray-200 text-gray-700 px-4 rounded-r-lg text-sm font-semibold hover:bg-gray-300">Suscribir</button>
                </form>
              </div>
              <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
                <div>
                  <h4 className="font-semibold text-gray-900">Producto</h4>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li><a href="#" className="hover:text-blue-600">Características</a></li>
                    <li><a href="#" className="hover:text-blue-600">Seguridad</a></li>
                    <li><a href="#" className="hover:text-blue-600">Precios</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Compañía</h4>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li><a href="#" className="hover:text-blue-600">Sobre nosotros</a></li>
                    <li><a href="#" className="hover:text-blue-600">Carreras</a></li>
                    <li><a href="#" className="hover:text-blue-600">Contacto</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Legal</h4>
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li><a href="#" className="hover:text-blue-600">Términos</a></li>
                    <li><a href="#" className="hover:text-blue-600">Privacidad</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
              <p>&copy; 2024 The Resolution Hub. Todos los derechos reservados.</p>
              <div className="flex space-x-4 mt-4 md:mt-0">
                <a href="#" className="hover:text-gray-900"><Github size={20} /></a>
                <a href="#" className="hover:text-gray-900"><Twitter size={20} /></a>
                <a href="#" className="hover:text-gray-900"><Linkedin size={20} /></a>
              </div>
            </div>
          </div>
        </footer>

        {/* Renderizar el modal si hay un artículo seleccionado */}
        {selectedArticle && <NewsModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />}
      </div>
    </>
  );
}

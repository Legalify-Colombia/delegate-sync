import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, FileText, Plus, Newspaper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import NewsEditor from '@/components/press/NewsEditor';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function CommunicationsSecretaryDashboard() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setAnnouncements(data || []);
    }
  };

  const createAnnouncement = async () => {
    if (!profile || !title.trim() || !content.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('announcements')
      .insert({
        title: title.trim(),
        content: content.trim(),
        author_id: profile.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el anuncio",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Anuncio creado correctamente",
      });
      setTitle('');
      setContent('');
      fetchAnnouncements();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">Panel del Secretario de Comunicaciones</h2>
          <p className="text-muted-foreground">Gestiona anuncios y documentos del evento</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Announcement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Crear Anuncio</span>
              </CardTitle>
              <CardDescription>Publica un nuevo anuncio para todos los participantes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título del anuncio"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Contenido</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Contenido del anuncio..."
                  rows={4}
                />
              </div>
              <Button 
                onClick={createAnnouncement} 
                disabled={loading || !title.trim() || !content.trim()}
                className="w-full"
              >
                {loading ? 'Publicando...' : 'Publicar Anuncio'}
              </Button>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Gestión de Documentos</span>
              </CardTitle>
              <CardDescription>Administra documentos y recursos para delegados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sistema de gestión de documentos próximamente...</p>
            </CardContent>
          </Card>
        </div>

        {/* News Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Newspaper className="h-5 w-5" />
              <span>Gestión de Noticias</span>
            </CardTitle>
            <CardDescription>Aprueba o rechaza las publicaciones de prensa</CardDescription>
          </CardHeader>
          <CardContent>
            <NewsEditor showApprovalInterface={true} />
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Anuncios Recientes</span>
            </CardTitle>
            <CardDescription>Últimos anuncios publicados</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.slice(0, 5).map((announcement) => (
                  <div key={announcement.id} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">{announcement.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No hay anuncios aún.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
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
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Panel del Secretario de Comunicaciones</h2>
          <p className="text-sm text-slate-500">Gestiona anuncios y documentos del evento</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Announcement */}
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <Plus className="h-5 w-5" />
                <span>Crear Anuncio</span>
              </CardTitle>
              <CardDescription className="text-slate-600">Publica un nuevo anuncio para todos los participantes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-slate-700">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título del anuncio"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-slate-700">Contenido</label>
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
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <FileText className="h-5 w-5" />
                <span>Gestión de Documentos</span>
              </CardTitle>
              <CardDescription className="text-slate-600">Administra documentos y recursos para delegados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500">Sistema de gestión de documentos próximamente...</p>
            </CardContent>
          </Card>
        </div>

        {/* News Management */}
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <Newspaper className="h-5 w-5" />
              <span>Gestión de Noticias</span>
            </CardTitle>
            <CardDescription className="text-slate-600">Aprueba o rechaza las publicaciones de prensa</CardDescription>
          </CardHeader>
          <CardContent>
            <NewsEditor showApprovalInterface={true} />
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <MessageSquare className="h-5 w-5" />
              <span>Anuncios Recientes</span>
            </CardTitle>
            <CardDescription className="text-slate-600">Últimos anuncios publicados</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.slice(0, 5).map((announcement) => (
                  <div key={announcement.id} className="p-4 border border-slate-200 rounded-lg">
                    <h4 className="font-semibold mb-2 text-slate-800">{announcement.title}</h4>
                    <p className="text-sm text-slate-600 mb-2">{announcement.content}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No hay anuncios aún.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
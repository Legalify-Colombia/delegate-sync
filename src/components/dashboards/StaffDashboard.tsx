import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, MessageSquare, FileText, Activity, Newspaper, Headphones } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import StaffRequestManager from '@/components/staff/StaffRequestManager';
import NewsEditor from '@/components/press/NewsEditor';

interface Committee {
  id: string;
  name: string;
  topic: string;
  current_status: 'active' | 'paused' | 'voting';
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function StaffDashboard() {
  const { profile } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch committees
    const { data: committeesData } = await supabase
      .from('committees')
      .select('*')
      .order('name');

    // Fetch announcements
    const { data: announcementsData } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    setCommittees(committeesData || []);
    setAnnouncements(announcementsData || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'voting': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Debate Activo';
      case 'voting': return 'Votación en Curso';
      case 'paused': return 'En Pausa';
      default: return 'Desconocido';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">Panel de Staff/Prensa</h2>
          <p className="text-muted-foreground">Observa el estado de los comités y accede a la información del evento</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Committee Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Estado de los Comités</span>
              </CardTitle>
              <CardDescription>Estado actual de todos los comités</CardDescription>
            </CardHeader>
            <CardContent>
              {committees.length > 0 ? (
                <div className="space-y-3">
                  {committees.map((committee) => (
                    <div key={committee.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{committee.name}</h4>
                        <p className="text-sm text-muted-foreground">{committee.topic}</p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`${getStatusColor(committee.current_status)} text-white`}
                      >
                        {getStatusText(committee.current_status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay comités disponibles.</p>
              )}
            </CardContent>
          </Card>

          {/* Activity Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Resumen de Actividad</span>
              </CardTitle>
              <CardDescription>Estadísticas generales del evento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total de Comités:</span>
                  <span className="font-medium">{committees.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Comités Activos:</span>
                  <span className="font-medium">
                    {committees.filter(c => c.current_status === 'active').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">En Votación:</span>
                  <span className="font-medium">
                    {committees.filter(c => c.current_status === 'voting').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">En Pausa:</span>
                  <span className="font-medium">
                    {committees.filter(c => c.current_status === 'paused').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Anuncios Recientes</span>
            </CardTitle>
            <CardDescription>Últimas noticias y comunicados del evento</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map((announcement) => (
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
              <p className="text-muted-foreground">No hay anuncios disponibles.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff Requests */}
          {profile?.role === 'staff' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Headphones className="h-5 w-5" />
                  <span>Solicitudes de Apoyo</span>
                </CardTitle>
                <CardDescription>Gestiona las solicitudes de los secretarios</CardDescription>
              </CardHeader>
              <CardContent>
                <StaffRequestManager isStaff={true} />
              </CardContent>
            </Card>
          )}

          {/* Press News */}
          {profile?.role === 'press' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Newspaper className="h-5 w-5" />
                  <span>Editor de Noticias</span>
                </CardTitle>
                <CardDescription>Crea y gestiona publicaciones de prensa</CardDescription>
              </CardHeader>
              <CardContent>
                <NewsEditor showApprovalInterface={false} />
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Documentos y Recursos</span>
              </CardTitle>
              <CardDescription>Accede a documentos oficiales del evento</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Sistema de documentos próximamente...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, MessageSquare, Building, Newspaper, Eye } from 'lucide-react';
import DetailedStatistics from '@/components/admin/DetailedStatistics';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author?: { full_name: string };
}

interface NewsPublication {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  author?: { full_name: string };
  committee?: { name: string };
}

interface Committee {
  id: string;
  name: string;
  topic: string;
  current_status: 'active' | 'paused' | 'voting';
  session_accumulated_seconds: number;
}

export default function SecretaryGeneralDashboard() {
  const [activeTab, setActiveTab] = useState('statistics');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [news, setNews] = useState<NewsPublication[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [announcementsRes, newsRes, committeesRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*, author:profiles!fk_announcements_author(full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('news_publications')
          .select('*, author:profiles(full_name), committee:committees(name)')
          .in('status', ['submitted_for_review', 'approved', 'published_internal'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('committees')
          .select('*')
          .order('name')
      ]);

      if (announcementsRes.data) setAnnouncements(announcementsRes.data as any);
      if (newsRes.data) setNews(newsRes.data as any);
      if (committeesRes.data) setCommittees(committeesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Panel del Secretario General</h2>
          <p className="text-sm text-slate-500">Supervisa el funcionamiento global del evento MUN</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="statistics" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Estadísticas del Modelo</span>
            </TabsTrigger>
            <TabsTrigger value="committees" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Comités</span>
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Anuncios</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center space-x-2">
              <Newspaper className="h-4 w-4" />
              <span>Noticias</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-6">
            <DetailedStatistics />
          </TabsContent>

          <TabsContent value="committees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado en Tiempo Real de los Comités</CardTitle>
                <CardDescription>Supervisa el funcionamiento de todos los comités</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {committees.map((committee) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'active': return 'bg-green-100 text-green-800 border-green-300';
                        case 'voting': return 'bg-blue-100 text-blue-800 border-blue-300';
                        case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                        default: return 'bg-gray-100 text-gray-800 border-gray-300';
                      }
                    };

                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'active': return 'Debate Activo';
                        case 'voting': return 'En Votación';
                        case 'paused': return 'En Pausa';
                        default: return 'Estado Desconocido';
                      }
                    };

                    const formatTime = (seconds: number) => {
                      const hours = Math.floor(seconds / 3600);
                      const minutes = Math.floor((seconds % 3600) / 60);
                      return `${hours}h ${minutes}m`;
                    };

                    return (
                      <Card key={committee.id} className="relative">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{committee.name}</CardTitle>
                          <CardDescription className="text-sm">{committee.topic}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(committee.current_status)}`}>
                              {getStatusText(committee.current_status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Tiempo acumulado: {formatTime(committee.session_accumulated_seconds || 0)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Anuncios Generales Recientes</CardTitle>
                <CardDescription>Comunicados publicados para todos los participantes</CardDescription>
              </CardHeader>
              <CardContent>
                {announcements.length > 0 ? (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="p-4 border-l-4 border-blue-500 bg-blue-50/50 rounded-r-lg">
                        <h4 className="font-semibold text-gray-800">{announcement.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-gray-500">
                            Por: {announcement.author?.full_name || 'Usuario desconocido'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(announcement.created_at).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay anuncios publicados.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Noticias en Desarrollo</CardTitle>
                <CardDescription>Seguimiento de publicaciones en proceso y aprobadas</CardDescription>
              </CardHeader>
              <CardContent>
                {news.length > 0 ? (
                  <div className="space-y-4">
                    {news.map((article) => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'submitted_for_review': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                          case 'approved': return 'bg-green-100 text-green-800 border-green-300';
                          case 'published_internal': return 'bg-blue-100 text-blue-800 border-blue-300';
                          default: return 'bg-gray-100 text-gray-800 border-gray-300';
                        }
                      };

                      const getStatusText = (status: string) => {
                        switch (status) {
                          case 'submitted_for_review': return 'En Revisión';
                          case 'approved': return 'Aprobada';
                          case 'published_internal': return 'Publicada';
                          default: return status;
                        }
                      };

                      return (
                        <div key={article.id} className="p-4 border rounded-lg bg-white shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-800">{article.title}</h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(article.status)}`}>
                              {getStatusText(article.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{article.content.substring(0, 150)}...</p>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                              <span>Por: {article.author?.full_name || 'Usuario desconocido'}</span>
                              {article.committee && (
                                <span>Comité: {article.committee.name}</span>
                              )}
                            </div>
                            <span>{new Date(article.created_at).toLocaleDateString('es-ES')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No hay noticias en desarrollo.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
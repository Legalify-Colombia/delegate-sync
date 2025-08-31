import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Building, Vote, Activity, MessageSquare, FileText, Clock, Award, TrendingUp, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DetailedStats {
  // Estadísticas básicas
  totalUsers: number;
  totalCommittees: number;
  activeCommittees: number;
  totalVotes: number;
  
  // Nuevas estadísticas
  delegatesByCommittee: { name: string; count: number }[];
  speakingRequests: number;
  staffRequests: { total: number; completed: number; pending: number };
  staffPerformance: { name: string; completed: number }[];
  mostActiveDelegate: { name: string; participations: number };
  mostActivePress: { name: string; publications: number }[];
  mostActiveCommitteeNews: { committee: string; newsCount: number };
  averageServiceTime: number;
  newsViews: { title: string; views: number }[];
}

export default function DetailedStatistics() {
  const [stats, setStats] = useState<DetailedStats>({
    totalUsers: 0,
    totalCommittees: 0,
    activeCommittees: 0,
    totalVotes: 0,
    delegatesByCommittee: [],
    speakingRequests: 0,
    staffRequests: { total: 0, completed: 0, pending: 0 },
    staffPerformance: [],
    mostActiveDelegate: { name: '', participations: 0 },
    mostActivePress: [],
    mostActiveCommitteeNews: { committee: '', newsCount: 0 },
    averageServiceTime: 0,
    newsViews: []
  });

  useEffect(() => {
    fetchDetailedStats();
  }, []);

  const fetchDetailedStats = async () => {
    try {
      // Estadísticas básicas
      const [usersRes, committeesRes, activeCommitteesRes, votesRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('committees').select('*', { count: 'exact', head: true }),
        supabase.from('committees').select('*', { count: 'exact', head: true }).eq('current_status', 'active'),
        supabase.from('votes').select('*', { count: 'exact', head: true })
      ]);

      // Delegados por comité
      const { data: delegatesData } = await supabase
        .from('profiles')
        .select('committee_id, committees(name)')
        .eq('role', 'delegate')
        .not('committee_id', 'is', null);

      const delegatesByCommittee = delegatesData?.reduce((acc: any[], delegate: any) => {
        const committeeName = delegate.committees?.name || 'Sin comité';
        const existing = acc.find(item => item.name === committeeName);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ name: committeeName, count: 1 });
        }
        return acc;
      }, []) || [];

      // Solicitudes de palabra
      const { count: speakingRequests } = await supabase
        .from('speaking_queue')
        .select('*', { count: 'exact', head: true });

      // Solicitudes de staff
      const [staffRequestsRes, completedStaffRes, pendingStaffRes] = await Promise.all([
        supabase.from('staff_requests').select('*', { count: 'exact', head: true }),
        supabase.from('staff_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('staff_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      // Personal de staff más productivo (especificando la relación con assigned_to)
      const { data: staffPerformanceData } = await supabase
        .from('staff_requests')
        .select('assigned_to, profiles!staff_requests_assigned_to_fkey(full_name)')
        .eq('status', 'completed')
        .not('assigned_to', 'is', null);

      const staffPerformance = staffPerformanceData?.reduce((acc: any[], request: any) => {
        const name = request.profiles?.full_name || 'Usuario desconocido';
        const existing = acc.find(item => item.name === name);
        if (existing) {
          existing.completed++;
        } else {
          acc.push({ name, completed: 1 });
        }
        return acc;
      }, []).sort((a: any, b: any) => b.completed - a.completed).slice(0, 5) || [];

      // Delegado más activo (basado en cola de palabra)
      const { data: activeDelegateData } = await supabase
        .from('speaking_queue')
        .select('delegate_id, profiles(full_name)')
        .not('delegate_id', 'is', null);

      const delegateParticipations = activeDelegateData?.reduce((acc: any, entry: any) => {
        const name = entry.profiles?.full_name || 'Usuario desconocido';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      const mostActiveDelegate = delegateParticipations ? 
        Object.entries(delegateParticipations).reduce((max: any, [name, count]: any) => 
          count > max.participations ? { name, participations: count } : max
        , { name: '', participations: 0 }) : { name: '', participations: 0 };

      // Personal de press más activo
      const { data: pressData } = await supabase
        .from('news_publications')
        .select('author_id, profiles(full_name)')
        .in('status', ['approved', 'published_internal']);

      const pressPerformance = pressData?.reduce((acc: any[], pub: any) => {
        const name = pub.profiles?.full_name || 'Usuario desconocido';
        const existing = acc.find(item => item.name === name);
        if (existing) {
          existing.publications++;
        } else {
          acc.push({ name, publications: 1 });
        }
        return acc;
      }, []).sort((a: any, b: any) => b.publications - a.publications).slice(0, 5) || [];

      // Comité más activo en noticias
      const { data: committeeNewsData } = await supabase
        .from('news_publications')
        .select('committee_id, committees(name)')
        .in('status', ['approved', 'published_internal'])
        .not('committee_id', 'is', null);

      const committeeNewsCount = committeeNewsData?.reduce((acc: any, news: any) => {
        const name = news.committees?.name || 'General';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      const mostActiveCommitteeNews = committeeNewsCount ?
        Object.entries(committeeNewsCount).reduce((max: any, [committee, count]: any) =>
          count > max.newsCount ? { committee, newsCount: count } : max
        , { committee: '', newsCount: 0 }) : { committee: '', newsCount: 0 };

      setStats({
        totalUsers: usersRes.count || 0,
        totalCommittees: committeesRes.count || 0,
        activeCommittees: activeCommitteesRes.count || 0,
        totalVotes: votesRes.count || 0,
        delegatesByCommittee,
        speakingRequests: speakingRequests || 0,
        staffRequests: {
          total: staffRequestsRes.count || 0,
          completed: completedStaffRes.count || 0,
          pending: pendingStaffRes.count || 0
        },
        staffPerformance,
        mostActiveDelegate,
        mostActivePress: pressPerformance,
        mostActiveCommitteeNews,
        averageServiceTime: 0, // Se puede calcular basado en created_at y completed_at
        newsViews: [] // Necesitaría una tabla de views para implementar esto
      });
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuarios registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes de Palabra</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.speakingRequests}</div>
            <p className="text-xs text-muted-foreground">Total de solicitudes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes Staff</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.staffRequests.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.staffRequests.completed} completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comités Activos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCommittees}</div>
            <p className="text-xs text-muted-foreground">de {stats.totalCommittees} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delegados por Comité */}
        <Card>
          <CardHeader>
            <CardTitle>Delegados por Comité</CardTitle>
            <CardDescription>Distribución de participantes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.delegatesByCommittee}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estado de Solicitudes Staff */}
        <Card>
          <CardHeader>
            <CardTitle>Estado Solicitudes Staff</CardTitle>
            <CardDescription>Distribución por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completadas', value: stats.staffRequests.completed },
                    { name: 'Pendientes', value: stats.staffRequests.pending }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                >
                  {[{ name: 'Completadas' }, { name: 'Pendientes' }].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff más productivo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Staff
            </CardTitle>
            <CardDescription>Personal más productivo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.staffPerformance.slice(0, 5).map((staff, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm font-medium">{staff.name}</span>
                  <span className="text-sm font-bold text-primary">{staff.completed}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delegado más activo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Delegado Destacado
            </CardTitle>
            <CardDescription>Mayor participación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.mostActiveDelegate.name}</div>
              <div className="text-sm text-muted-foreground">
                {stats.mostActiveDelegate.participations} participaciones
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Press más activo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Top Press
            </CardTitle>
            <CardDescription>Más publicaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.mostActivePress.slice(0, 3).map((press, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm font-medium">{press.name}</span>
                  <span className="text-sm font-bold text-primary">{press.publications}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Comité Más Activo en Noticias</CardTitle>
          <CardDescription>Mayor cobertura mediática</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-xl font-bold">{stats.mostActiveCommitteeNews.committee || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">
              {stats.mostActiveCommitteeNews.newsCount} publicaciones
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
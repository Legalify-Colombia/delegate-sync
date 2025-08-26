import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, Vote, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalUsers: number;
  totalCommittees: number;
  activeCommittees: number;
  totalVotes: number;
}

export default function SystemOverview() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCommittees: 0,
    activeCommittees: 0,
    totalVotes: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total committees
      const { count: totalCommittees } = await supabase
        .from('committees')
        .select('*', { count: 'exact', head: true });

      // Fetch active committees
      const { count: activeCommittees } = await supabase
        .from('committees')
        .select('*', { count: 'exact', head: true })
        .eq('current_status', 'active');

      // Fetch total votes
      const { count: totalVotes } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: totalUsers || 0,
        totalCommittees: totalCommittees || 0,
        activeCommittees: activeCommittees || 0,
        totalVotes: totalVotes || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    {
      title: 'Total de Usuarios',
      value: stats.totalUsers,
      icon: Users,
      description: 'Usuarios registrados en el sistema',
    },
    {
      title: 'Total de Comités',
      value: stats.totalCommittees,
      icon: Building,
      description: 'Comités creados en el sistema',
    },
    {
      title: 'Comités Activos',
      value: stats.activeCommittees,
      icon: Activity,
      description: 'Comités con debate en curso',
    },
    {
      title: 'Total de Votos',
      value: stats.totalVotes,
      icon: Vote,
      description: 'Votos emitidos en total',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
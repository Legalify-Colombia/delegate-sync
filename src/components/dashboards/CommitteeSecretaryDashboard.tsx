import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Vote, Star, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CommitteeTimer from '@/components/realtime/CommitteeTimer';
import VotingPanel from '@/components/realtime/VotingPanel';

interface Committee {
  id: string;
  name: string;
  topic: string;
  current_status: 'active' | 'paused' | 'voting';
}

export default function CommitteeSecretaryDashboard() {
  const { profile } = useAuth();
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.committee_id) {
      fetchCommitteeData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchCommitteeData = async () => {
    if (!profile?.committee_id) return;

    const { data, error } = await supabase
      .from('committees')
      .select('*')
      .eq('id', profile.committee_id)
      .single();

    if (error) {
      console.error('Error fetching committee:', error);
    } else {
      setCommittee(data);
    }
    setLoading(false);
  };

  const updateCommitteeStatus = async (status: 'active' | 'paused' | 'voting') => {
    if (!committee) return;

    const { error } = await supabase
      .from('committees')
      .update({ current_status: status })
      .eq('id', committee.id);

    if (!error) {
      setCommittee({ ...committee, current_status: status });
    }
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

  if (!committee) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Sin Comité Asignado</CardTitle>
              <CardDescription>
                Por favor contacta a un administrador para ser asignado a un comité.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">Panel del Secretario de Comité</h2>
          <p className="text-muted-foreground">Controla el debate y las votaciones de tu comité</p>
        </div>

        {/* Committee Info */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>{committee.name}</span>
                </CardTitle>
                <CardDescription className="mt-2">{committee.topic}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="secondary" 
                  className={`${getStatusColor(committee.current_status)} text-white`}
                >
                  {getStatusText(committee.current_status)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button 
                variant={committee.current_status === 'active' ? 'default' : 'outline'}
                onClick={() => updateCommitteeStatus('active')}
              >
                Iniciar Debate
              </Button>
              <Button 
                variant={committee.current_status === 'paused' ? 'default' : 'outline'}
                onClick={() => updateCommitteeStatus('paused')}
              >
                Pausar
              </Button>
              <Button 
                variant={committee.current_status === 'voting' ? 'default' : 'outline'}
                onClick={() => updateCommitteeStatus('voting')}
              >
                Iniciar Votación
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timer Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Control de Temporizador</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommitteeTimer committeeId={committee.id} isSecretary={true} />
            </CardContent>
          </Card>

          {/* Voting Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Vote className="h-5 w-5" />
                <span>Control de Votación</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VotingPanel committeeId={committee.id} isSecretary={true} />
            </CardContent>
          </Card>

          {/* Speaking Queue Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Gestión de Intervenciones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpeakingQueue committeeId={committee.id} isSecretary={true} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Detailed Rating */}
          <DetailedRatingForm />

          {/* Staff Requests */}
          <StaffRequestManager />
      </main>
    </div>
  );
}
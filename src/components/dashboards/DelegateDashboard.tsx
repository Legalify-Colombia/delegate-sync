import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Vote, FileText, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CommitteeTimer from '@/components/realtime/CommitteeTimer';
import VotingPanel from '@/components/realtime/VotingPanel';
import SpeakingQueue from '@/components/realtime/SpeakingQueue';
import DelegateNotes from '@/components/delegate/DelegateNotes';

interface Committee {
  id: string;
  name: string;
  topic: string;
  current_status: 'active' | 'paused' | 'voting';
}

interface Rating {
  score: number;
  comments: string;
  created_at: string;
}

export default function DelegateDashboard() {
  const { profile } = useAuth();
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.committee_id) {
      fetchCommitteeData();
      fetchRatings();
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

  const fetchRatings = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('ratings')
      .select('score, comments, created_at')
      .eq('delegate_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
    } else {
      setRatings(data || []);
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

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length).toFixed(1)
    : 'N/A';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">Panel del Delegado</h2>
          <p className="text-muted-foreground">Participa en el debate y votaciones de tu comité</p>
        </div>

        {/* Committee Info */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>{committee.name}</span>
                </CardTitle>
                <CardDescription className="mt-2">{committee.topic}</CardDescription>
              </div>
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(committee.current_status)}`}
              >
                {getStatusText(committee.current_status)}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Temporizador de Debate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommitteeTimer committeeId={committee.id} />
            </CardContent>
          </Card>

          {/* Voting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Vote className="h-5 w-5" />
                <span>Votación</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VotingPanel committeeId={committee.id} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Speaking Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Intervenciones</CardTitle>
              <CardDescription>Solicita tu turno para hablar</CardDescription>
            </CardHeader>
            <CardContent>
              <SpeakingQueue committeeId={committee.id} />
            </CardContent>
          </Card>

          {/* Delegate Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Mis Notas</CardTitle>
              <CardDescription>Notas privadas del debate</CardDescription>
            </CardHeader>
            <CardContent>
              <DelegateNotes />
            </CardContent>
          </Card>
        </div>

        {/* Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Mis Calificaciones</span>
            </CardTitle>
            <CardDescription>
              Calificación promedio: {averageRating} / 10
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ratings.length > 0 ? (
              <div className="space-y-3">
                {ratings.slice(0, 3).map((rating, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{rating.score}/10</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {rating.comments && (
                        <p className="text-sm text-muted-foreground mt-1">{rating.comments}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aún no tienes calificaciones.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
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
      <div className="min-h-screen bg-slate-100">
        <DashboardHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Sin Comité Asignado</h3>
            <p className="text-sm text-slate-500">
              Por favor contacta a un administrador para ser asignado a un comité.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length).toFixed(1)
    : 'N/A';

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Panel del Delegado</h2>
            <p className="text-sm text-slate-500">Participa en el debate y votaciones de tu comité</p>
          </motion.div>

          {/* Committee Info */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2 text-slate-800">
                      <FileText className="h-5 w-5" />
                      <span>{committee.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600">{committee.topic}</CardDescription>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`${getStatusColor(committee.current_status)} text-white`}
                  >
                    {getStatusText(committee.current_status)}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timer */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Clock className="h-5 w-5" />
                  <span>Temporizador de Debate</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommitteeTimer committeeId={committee.id} />
              </CardContent>
            </Card>

            {/* Voting */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Vote className="h-5 w-5" />
                  <span>Votación</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VotingPanel committeeId={committee.id} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Speaking Queue */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="text-slate-800">Lista de Intervenciones</CardTitle>
                <CardDescription className="text-slate-600">Solicita tu turno para hablar</CardDescription>
              </CardHeader>
              <CardContent>
                <SpeakingQueue committeeId={committee.id} />
              </CardContent>
            </Card>

            {/* Delegate Notes */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="text-slate-800">Mis Notas</CardTitle>
                <CardDescription className="text-slate-600">Notas privadas del debate</CardDescription>
              </CardHeader>
              <CardContent>
                <DelegateNotes />
              </CardContent>
            </Card>
          </motion.div>

          {/* Ratings */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Star className="h-5 w-5" />
                  <span>Mis Calificaciones</span>
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Calificación promedio: {averageRating} / 10
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ratings.length > 0 ? (
                  <div className="space-y-3">
                    {ratings.slice(0, 3).map((rating, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">{rating.score}/10</span>
                            <span className="text-sm text-slate-500">
                              {new Date(rating.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {rating.comments && (
                            <p className="text-sm text-slate-600 mt-1">{rating.comments}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">Aún no tienes calificaciones.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
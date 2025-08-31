import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Vote, Star, Users, MessageSquare, Headphones } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CommitteeTimer from '@/components/realtime/CommitteeTimer';
import VotingPanel from '@/components/realtime/VotingPanel';
import SpeakingQueue from '@/components/realtime/SpeakingQueue';
import AttendancePanel from '@/components/realtime/AttendancePanel';
import DetailedRatingForm from '@/components/ratings/DetailedRatingForm';
import StaffRequestManager from '@/components/staff/StaffRequestManager';


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
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Panel del Secretario de Comité</h2>
            <p className="text-sm text-slate-500">Controla el debate y las votaciones de tu comité</p>
          </motion.div>

          {/* Committee Info */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2 text-slate-800">
                      <Users className="h-5 w-5" />
                      <span>{committee.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600">{committee.topic}</CardDescription>
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
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timer Control */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Clock className="h-5 w-5" />
                  <span>Control de Temporizador</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommitteeTimer committeeId={committee.id} isSecretary={true} />
              </CardContent>
            </Card>

            {/* Voting Control */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Vote className="h-5 w-5" />
                  <span>Control de Votación</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VotingPanel committeeId={committee.id} isSecretary={true} />
              </CardContent>
            </Card>

            {/* Speaking Queue Management */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <MessageSquare className="h-5 w-5" />
                  <span>Gestión de Intervenciones</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SpeakingQueue committeeId={committee.id} isSecretary={true} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detailed Rating */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Star className="h-5 w-5" />
                  <span>Calificación Detallada</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DetailedRatingForm />
              </CardContent>
            </Card>

            {/* Staff Requests */}
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-slate-800">
                  <Headphones className="h-5 w-5" />
                  <span>Solicitudes de Staff</span>
                </CardTitle>
                <CardDescription className="text-slate-600">Solicita apoyo del equipo de staff</CardDescription>
              </CardHeader>
              <CardContent>
                <StaffRequestManager isStaff={false} />
              </CardContent>
            </Card>

            {/* Attendance Control */}
            <div className="lg:col-span-2">
              <AttendancePanel committeeId={committee.id} />
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
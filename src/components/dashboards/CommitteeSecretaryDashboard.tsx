import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Vote, Star, Users, MessageSquare, Headphones, ExternalLink, Copy, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
      case 'active': return 'bg-success';
      case 'voting': return 'bg-primary';
      case 'paused': return 'bg-warning';
      default: return 'bg-muted';
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

  const copyPublicLink = async () => {
    const publicUrl = `${window.location.origin}/debate/${committee?.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Enlace copiado al portapapeles');
    } catch (error) {
      toast.error('Error al copiar el enlace');
    }
  };

  const openPublicView = () => {
    const publicUrl = `/debate/${committee?.id}`;
    window.open(publicUrl, '_blank');
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
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Panel del Secretario de Comité</h1>
                <p className="text-muted-foreground">Bienvenido. Controla y modera la sesión desde aquí.</p>
              </div>
            </div>
          </motion.div>

          {/* Committee Info Card */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-primary" />
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{committee.name}</h2>
                      <p className="text-muted-foreground">{committee.topic}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={`${getStatusColor(committee.current_status)} text-primary-foreground`}>
                      {getStatusText(committee.current_status)}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={openPublicView}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Pantalla Pública
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyPublicLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Enlace
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <p className="text-sm text-muted-foreground mr-4">Control de Sesión:</p>
                  <Button 
                    variant={committee.current_status === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCommitteeStatus('active')}
                  >
                    Iniciar Debate
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => updateCommitteeStatus('paused')}
                  >
                    Pausar
                  </Button>
                  <Button 
                    variant={committee.current_status === 'voting' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateCommitteeStatus(committee.current_status === 'voting' ? 'paused' : 'voting')}
                  >
                    {committee.current_status === 'voting' ? 'Detener Votación' : 'Iniciar Votación'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="debate" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="debate" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Gestión del Debate</span>
                </TabsTrigger>
                <TabsTrigger value="delegates" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Lista de Delegados</span>
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex items-center space-x-2">
                  <Headphones className="h-4 w-4" />
                  <span>Solicitudes</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="debate" className="space-y-6 mt-6">
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

                {/* Voting Control - Full Width */}
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

                {/* Detailed Rating */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5" />
                      <span>Calificación Detallada</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailedRatingForm />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="delegates" className="mt-6">
                <AttendancePanel committeeId={committee.id} />
              </TabsContent>

              <TabsContent value="requests" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Headphones className="h-5 w-5" />
                      <span>Solicitudes de Staff</span>
                    </CardTitle>
                    <CardDescription>Solicita apoyo del equipo de staff</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StaffRequestManager isStaff={false} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
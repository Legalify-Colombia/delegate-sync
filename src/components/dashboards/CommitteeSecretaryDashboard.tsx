import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Vote, Star, Users, MessageSquare, Headphones, ExternalLink, Copy, Settings, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CommitteeTimer from '@/components/realtime/CommitteeTimer';
import VotingPanel from '@/components/realtime/VotingPanel';
import SpeakingQueue from '@/components/realtime/SpeakingQueue';
import DelegateWarnings from '@/components/secretary/DelegateWarnings';
import StaffRequestManager from '@/components/staff/StaffRequestManager';
import AgendaManager from '@/components/agenda/AgendaManager';
import SecretarySpeaking from '@/components/secretary/SecretarySpeaking';
import AdvancedVotingPanel from '@/components/voting/AdvancedVotingPanel';


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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Panel del Secretario</h1>
              <p className="text-sm md:text-base text-muted-foreground">Controla y modera la sesión</p>
            </div>
          </motion.div>

          {/* Committee Info Card */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{committee.name}</h2>
                        <p className="text-sm text-muted-foreground">{committee.topic}</p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(committee.current_status)} text-primary-foreground self-start`}>
                      {getStatusText(committee.current_status)}
                    </Badge>
                  </div>
                  
                  {/* Mobile Quick Actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button 
                      variant={committee.current_status === 'active' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateCommitteeStatus('active')}
                      className="text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Debate
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => updateCommitteeStatus('paused')}
                      className="text-xs"
                    >
                      Pausar
                    </Button>
                    <Button 
                      variant={committee.current_status === 'voting' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateCommitteeStatus(committee.current_status === 'voting' ? 'paused' : 'voting')}
                      className="text-xs"
                    >
                      <Vote className="h-3 w-3 mr-1" />
                      Votar
                    </Button>
                    <Button variant="outline" size="sm" onClick={openPublicView} className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                  </div>
                  
                  {/* Desktop Actions - Hidden on mobile */}
                  <div className="hidden sm:flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyPublicLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Enlace
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="debate" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="debate" className="flex items-center space-x-1 text-xs sm:text-sm">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Gestión del Debate</span>
                  <span className="sm:hidden">Debate</span>
                </TabsTrigger>
                <TabsTrigger value="agenda" className="flex items-center space-x-1 text-xs sm:text-sm">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Agenda</span>
                  <span className="sm:hidden">Agenda</span>
                </TabsTrigger>
                <TabsTrigger value="delegates" className="flex items-center space-x-1 text-xs sm:text-sm">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Lista de Delegados</span>
                  <span className="sm:hidden">Delegados</span>
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex items-center space-x-1 text-xs sm:text-sm">
                  <Headphones className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Solicitudes</span>
                  <span className="sm:hidden">Staff</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="debate" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Secretary Speaking Control */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <MessageSquare className="h-4 w-4" />
                        <span>Control del Secretario</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SecretarySpeaking committeeId={committee.id} />
                    </CardContent>
                  </Card>

                  {/* Timer Control */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <Clock className="h-4 w-4" />
                        <span>Temporizador</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CommitteeTimer committeeId={committee.id} isSecretary={true} />
                    </CardContent>
                  </Card>

                  {/* Speaking Queue Management */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-base">
                        <MessageSquare className="h-4 w-4" />
                        <span>Intervenciones</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SpeakingQueue committeeId={committee.id} isSecretary={true} />
                    </CardContent>
                  </Card>
                </div>

                {/* Advanced Voting Control - Full Width */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Vote className="h-4 w-4" />
                      <span>Sistema de Votación Avanzado</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AdvancedVotingPanel committeeId={committee.id} isSecretary={true} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="agenda" className="mt-4">
                <AgendaManager committeeId={committee.id} />
              </TabsContent>

              <TabsContent value="delegates" className="mt-6">
                <DelegateWarnings committeeId={committee.id} />
              </TabsContent>

              <TabsContent value="requests" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Headphones className="h-4 w-4" />
                      <span>Solicitudes</span>
                    </CardTitle>
                    <CardDescription className="text-sm">Solicita apoyo del equipo de staff</CardDescription>
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
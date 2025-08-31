import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  position: number;
  status: 'pending' | 'active' | 'completed';
  is_active: boolean;
  time_allocated: number;
  started_at?: string;
  completed_at?: string;
}

interface AgendaParticipation {
  id: string;
  delegate_id: string;
  participation_type: string;
  time_used: number;
  started_at: string;
  ended_at?: string;
  profiles: {
    full_name: string;
    countries?: { name: string };
  };
}

interface PublicAgendaDisplayProps {
  committeeId: string;
}

export default function PublicAgendaDisplay({ committeeId }: PublicAgendaDisplayProps) {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [participations, setParticipations] = useState<AgendaParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (committeeId) {
      fetchAgendaData();
      subscribeToChanges();
    }
  }, [committeeId]);

  const fetchAgendaData = async () => {
    // Cargar items de agenda
    const { data: agendaData } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('committee_id', committeeId)
      .order('position', { ascending: true });

    if (agendaData) {
      setAgendaItems(agendaData as AgendaItem[]);
      
      // Cargar participaciones para el item activo
      const activeItem = agendaData.find(item => item.is_active);
      if (activeItem) {
        await fetchParticipations(activeItem.id);
      }
    }
    
    setLoading(false);
  };

  const fetchParticipations = async (agendaItemId: string) => {
    const { data: participationData } = await supabase
      .from('agenda_participations')
      .select(`
        id,
        delegate_id,
        participation_type,
        time_used,
        started_at,
        ended_at,
        profiles!agenda_participations_delegate_id_fkey (
          full_name,
          countries (name)
        )
      `)
      .eq('agenda_item_id', agendaItemId)
      .order('started_at', { ascending: false });

    if (participationData) {
      setParticipations(participationData.map((p: any) => ({
        id: p.id,
        delegate_id: p.delegate_id,
        participation_type: p.participation_type,
        time_used: p.time_used,
        started_at: p.started_at,
        ended_at: p.ended_at,
        profiles: {
          full_name: p.profiles?.full_name || 'Desconocido',
          countries: p.profiles?.countries ? { name: p.profiles.countries.name } : undefined
        }
      })));
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`public-agenda-${committeeId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agenda_items',
        filter: `committee_id=eq.${committeeId}`
      }, fetchAgendaData)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agenda_participations'
      }, () => {
        const activeItem = agendaItems.find(item => item.is_active);
        if (activeItem) {
          fetchParticipations(activeItem.id);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'En Progreso';
      case 'completed': return 'Completado';
      default: return 'Pendiente';
    }
  };

  const activeItem = agendaItems.find(item => item.is_active);
  const completedItems = agendaItems.filter(item => item.status === 'completed');
  const pendingItems = agendaItems.filter(item => item.status === 'pending' && !item.is_active);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">Cargando agenda...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Active Item */}
      {activeItem && (
        <Card className="border-success bg-success/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-success" />
              <span>Punto Actual en Discusión</span>
              <Badge className="bg-success text-success-foreground animate-pulse">
                ACTIVO
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">{activeItem.title}</h3>
                {activeItem.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeItem.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Posición: {activeItem.position}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Tiempo estimado: {formatTime(activeItem.time_allocated)}
                  </span>
                  {activeItem.started_at && (
                    <span>
                      Iniciado: {new Date(activeItem.started_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Recent Participations */}
              {participations.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participaciones Recientes
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {participations.slice(0, 5).map((participation) => (
                      <motion.div
                        key={participation.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-2 bg-background rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {participation.profiles.countries?.name || 'Sin país'}
                            </span>
                            {participation.participation_type === 'mocion' && (
                              <Badge variant="outline" className="text-xs">MOCIÓN</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {participation.profiles.full_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono">
                            {formatTime(participation.time_used)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(participation.started_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agenda Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Agenda del Debate</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agendaItems.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay elementos en la agenda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agendaItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border ${
                    item.is_active 
                      ? 'border-success bg-success/5' 
                      : item.status === 'completed' 
                      ? 'border-muted bg-muted/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {item.position}
                        </Badge>
                        <span className={`font-medium ${
                          item.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {item.title}
                        </span>
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusText(item.status)}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 ml-11">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {item.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-success mr-2" />
                      )}
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(item.time_allocated)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
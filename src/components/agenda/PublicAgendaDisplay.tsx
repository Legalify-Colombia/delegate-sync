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

  if (loading) {
    return <div className="text-xs text-muted-foreground">Cargando agenda...</div>;
  }

  // Solo mostrar si hay un item activo
  if (!activeItem) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <FileText className="h-3 w-3 text-orange-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase">Resolución</span>
        </div>
        <div className="text-sm font-semibold text-foreground line-clamp-2">{activeItem.title}</div>
        <Badge className="bg-success text-success-foreground text-xs mt-1 animate-pulse">
          EN CURSO
        </Badge>
      </div>
      
      {/* Participaciones recientes en formato compacto */}
      {participations.length > 0 && (
        <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
          {participations.slice(0, 3).map((participation) => (
            <div
              key={participation.id}
              className="flex items-center justify-between text-xs bg-background/50 rounded p-1"
            >
              <span className="truncate font-medium">
                {participation.profiles.countries?.name || 'Sin país'}
              </span>
              <span className="text-muted-foreground font-mono">
                {formatTime(participation.time_used)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
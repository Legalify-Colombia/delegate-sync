import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, FileText, Users as UsersIcon, Clock, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { Logo } from '@/components/ui/logo';
import PublicAgendaDisplay from '@/components/agenda/PublicAgendaDisplay';

interface Committee {
  id: string;
  name: string;
  topic: string;
  current_status: string;
  current_timer_end?: string;
  session_started_at?: string;
  session_accumulated_seconds: number;
  current_timer_remaining_seconds?: number;
}

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'completed';
  is_active: boolean;
  position: number;
}

interface SecretarySpeaking {
  id: string;
  secretary_id: string;
  is_active: boolean;
  started_at?: string;
  profiles: {
    full_name: string;
  };
}

interface Delegate {
  id: string;
  country_name: string;
  full_name: string;
  photo_url?: string;
  entity: string;
  isPermanent?: boolean;
}

interface Vote {
  user_id: string;
  vote_type: 'for' | 'against' | 'abstain';
}

interface SpeakingQueue {
  delegate_id: string;
  status: string;
  started_at?: string;
  time_allocated?: number;
  position?: number;
  profiles: {
    full_name: string;
    country_name: string;
    photo_url?: string;
    'Entidad que representa'?: string;
  };
}

// Componente de Temporizadores
const TimerDisplay = ({ sessionTime, speakerTimeLeft }: { sessionTime: number; speakerTimeLeft: number }) => {
  const formatTime = (seconds: number) => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hrs = Math.floor(absSeconds / 3600);
    const mins = Math.floor((absSeconds % 3600) / 60);
    const secs = absSeconds % 60;
    
    const timeString = hrs > 0 
      ? `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    return isNegative ? `-${timeString}` : timeString;
  };

  const getSpeakerTimeColor = () => {
    if (speakerTimeLeft < 0) return 'text-destructive animate-pulse';
    if (speakerTimeLeft <= 10) return 'text-destructive';
    if (speakerTimeLeft <= 30) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="flex divide-x divide-border">
      <div className="px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">Tiempo de Sesión</p>
        <p className="text-4xl font-bold tracking-tighter text-foreground">{formatTime(sessionTime)}</p>
      </div>
      <div className="px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">Tiempo de Intervención</p>
        <p className={`text-4xl font-bold tracking-tighter transition-colors ${getSpeakerTimeColor()}`}>
          {formatTime(speakerTimeLeft)}
        </p>
        {speakerTimeLeft < 0 && (
          <p className="text-xs text-destructive font-medium mt-1">TIEMPO EXCEDIDO</p>
        )}
      </div>
    </div>
  );
};

// Componente para mostrar al orador actual (delegado o secretario)
const CurrentSpeakerHeader = ({ 
  speaker, 
  secretary, 
  isMotion 
}: { 
  speaker: SpeakingQueue | null; 
  secretary: SecretarySpeaking | null;
  isMotion?: boolean;
}) => {
  // Priorizar secretario si está hablando
  if (secretary?.is_active) {
    return (
      <motion.div
        key={secretary.secretary_id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex items-center gap-4 bg-primary/10 border border-primary/20 p-4 rounded-2xl min-w-[400px]"
      >
        <div className="w-20 h-20 rounded-full ring-4 ring-primary bg-primary/20 flex items-center justify-center">
          <Mic className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
            <span className="text-xs font-medium text-primary uppercase tracking-wide">SECRETARIO HABLANDO</span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">Secretario de Comité</p>
          <p className="text-lg text-muted-foreground font-medium">{secretary.profiles.full_name}</p>
          <p className="text-sm text-muted-foreground">Moderando la sesión</p>
        </div>
      </motion.div>
    );
  }

  if (!speaker) return (
    <div className="min-w-[400px] h-[116px] bg-background/20 rounded-2xl flex items-center justify-center">
      <p className="text-muted-foreground">No hay orador activo</p>
    </div>
  );

  return (
    <motion.div
      key={speaker.delegate_id}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex items-center gap-4 bg-success/10 border border-success/20 p-4 rounded-2xl min-w-[400px]"
    >
      <img 
        src={speaker.profiles.photo_url || `https://placehold.co/128x128/10B981/FFFFFF?text=${speaker.profiles.country_name.slice(0, 3).toUpperCase()}`} 
        alt={speaker.profiles.full_name} 
        className="w-20 h-20 rounded-full ring-4 ring-success object-cover" 
      />
      <div className="flex-1">
        <AnimatePresence>
          {isMotion && 
            <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="flex items-center gap-2 text-warning font-bold text-sm mb-1">
              <Gavel size={14}/> MOCIÓN DE ORDEN
            </motion.div>
          }
        </AnimatePresence>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse"></div>
          <span className="text-xs font-medium text-success uppercase tracking-wide">EN VIVO</span>
        </div>
        <p className="text-2xl font-bold text-foreground mb-1">{speaker.profiles.country_name}</p>
        <p className="text-lg text-muted-foreground font-medium">{speaker.profiles.full_name}</p>
        <p className="text-sm text-muted-foreground">{speaker.profiles['Entidad que representa']}</p>
      </div>
    </motion.div>
  );
};

export default function PublicDebateView() {
  const { committeeId } = useParams<{ committeeId: string }>();
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [votes, setVotes] = useState<{ [key: string]: string }>({});
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakingQueue | null>(null);
  const [secretarySpeaking, setSecretarySpeaking] = useState<SecretarySpeaking | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [speakingQueue, setSpeakingQueue] = useState<SpeakingQueue[]>([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [speakerTimeLeft, setSpeakerTimeLeft] = useState(0);
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [voteCount, setVoteCount] = useState({ for: 0, against: 0, abstain: 0 });

  // Cargar datos iniciales
  useEffect(() => {
    if (!committeeId) return;

    const loadInitialData = async () => {
      // Cargar comité
      const { data: committeeData } = await supabase
        .from('committees')
        .select('*')
        .eq('id', committeeId)
        .single();
      
      if (committeeData) {
        setCommittee(committeeData);
      }

      // Cargar delegados
      const { data: delegatesData } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          Photo_url,
          "Entidad que representa",
          countries!profiles_country_id_fkey (
            name,
            code
          )
        `)
        .eq('committee_id', committeeId)
        .eq('role', 'delegate');

      if (delegatesData) {
        const formattedDelegates = delegatesData.map((d: any) => ({
          id: d.id,
          country_name: d.countries?.name || 'Sin país',
          full_name: d.full_name,
          photo_url: d.Photo_url,
          entity: d['Entidad que representa'] || '',
          isPermanent: ['EE.UU.', 'China', 'Francia', 'Rusia', 'Reino Unido'].includes(d.countries?.name)
        }));
        setDelegates(formattedDelegates);
      }

      // Verificar si hay votación activa
      const { data: votesData } = await supabase
        .from('votes')
        .select('user_id, vote_type')
        .eq('committee_id', committeeId);

      if (votesData && votesData.length > 0) {
        setIsVotingActive(true);
        const voteMap: { [key: string]: string } = {};
        votesData.forEach(vote => {
          voteMap[vote.user_id] = vote.vote_type;
        });
        setVotes(voteMap);
      }

      // Cargar orador actual y cola sin joins FK
      const { data: speakerQueueData } = await supabase
        .from('speaking_queue')
        .select('delegate_id, status, started_at, time_allocated, position')
        .eq('committee_id', committeeId)
        .eq('status', 'speaking')
        .maybeSingle();

      const { data: queueData } = await supabase
        .from('speaking_queue')
        .select('delegate_id, status, position')
        .eq('committee_id', committeeId)
        .eq('status', 'pending')
        .order('position');

      // Si hay orador actual, cargar sus datos
      if (speakerQueueData) {
        const { data: speakerProfile } = await supabase
          .from('profiles')
          .select('full_name, Photo_url, "Entidad que representa", country_id')
          .eq('id', speakerQueueData.delegate_id)
          .single();

        if (speakerProfile) {
          let countryName = 'Sin país';
          if (speakerProfile.country_id) {
            const { data: country } = await supabase
              .from('countries')
              .select('name')
              .eq('id', speakerProfile.country_id)
              .single();
            countryName = country?.name || 'Sin país';
          }

          setCurrentSpeaker({
            delegate_id: speakerQueueData.delegate_id,
            status: speakerQueueData.status,
            started_at: speakerQueueData.started_at,
            time_allocated: speakerQueueData.time_allocated,
            position: speakerQueueData.position,
            profiles: {
              full_name: speakerProfile.full_name,
              country_name: countryName,
              photo_url: speakerProfile.Photo_url,
              'Entidad que representa': speakerProfile['Entidad que representa'] || ''
            }
          });
        }
      }

      // Cargar cola con perfiles
      if (queueData && queueData.length > 0) {
        const queueWithProfiles = await Promise.all(
          queueData.map(async (item: any) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, Photo_url, "Entidad que representa", country_id')
              .eq('id', item.delegate_id)
              .single();

            let countryName = 'Sin país';
            if (profile?.country_id) {
              const { data: country } = await supabase
                .from('countries')
                .select('name')
                .eq('id', profile.country_id)
                .single();
              countryName = country?.name || 'Sin país';
            }

            return {
              delegate_id: item.delegate_id,
              status: item.status,
              position: item.position,
              profiles: {
                full_name: profile?.full_name || '',
                country_name: countryName,
                photo_url: profile?.Photo_url,
                'Entidad que representa': profile?.['Entidad que representa'] || ''
              }
            };
          })
        );
        setSpeakingQueue(queueWithProfiles);
      }

      // Cargar agenda items
      const { data: agendaData } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('committee_id', committeeId)
        .order('position');

      if (agendaData) {
        setAgendaItems(agendaData as AgendaItem[]);
      }

      // Cargar estado del secretario hablando
      const { data: secretaryData } = await supabase
        .from('secretary_speaking')
        .select(`
          id,
          secretary_id,
          is_active,
          started_at,
          profiles!secretary_speaking_secretary_id_fkey (
            full_name
          )
        `)
        .eq('committee_id', committeeId)
        .eq('is_active', true)
        .maybeSingle();

      if (secretaryData) {
        setSecretarySpeaking({
          id: secretaryData.id,
          secretary_id: secretaryData.secretary_id,
          is_active: secretaryData.is_active,
          started_at: secretaryData.started_at,
          profiles: {
            full_name: (secretaryData.profiles as any)?.full_name || 'Secretario'
          }
        });
      }
      setIsVotingActive(committeeData?.current_status === 'voting');
      
      // Si hay votación activa, cargar votos
      if (committeeData?.current_status === 'voting') {
        const { data: votesData } = await supabase
          .from('votes')
          .select('user_id, vote_type')
          .eq('committee_id', committeeId);

        if (votesData && votesData.length > 0) {
          const voteMap: { [key: string]: string } = {};
          const counts = { for: 0, against: 0, abstain: 0 };
          votesData.forEach(vote => {
            voteMap[vote.user_id] = vote.vote_type;
            counts[vote.vote_type as keyof typeof counts]++;
          });
          setVotes(voteMap);
          setVoteCount(counts);
        } else {
          setVotes({});
          setVoteCount({ for: 0, against: 0, abstain: 0 });
        }
      } else {
        setIsVotingActive(false);
        setVotes({});
        setVoteCount({ for: 0, against: 0, abstain: 0 });
      }
    };

    loadInitialData();
  }, [committeeId]);

  // Timer de sesión - basado en datos de Supabase
  useEffect(() => {
    if (!committee) return;

    const updateSessionTime = () => {
      let totalSeconds = committee.session_accumulated_seconds || 0;
      
      if (committee.current_status === 'active' && committee.session_started_at) {
        const startTime = new Date(committee.session_started_at).getTime();
        const now = Date.now();
        const currentSessionSeconds = Math.floor((now - startTime) / 1000);
        totalSeconds += currentSessionSeconds;
      }
      
      setSessionTime(totalSeconds);
    };

    updateSessionTime();
    
    if (committee.current_status === 'active' && committee.session_started_at) {
      const interval = setInterval(updateSessionTime, 1000);
      return () => clearInterval(interval);
    }
  }, [committee]);

  // Timer del orador - basado en temporizador del comité (permite negativo)
  useEffect(() => {
    if (!committee) return;

    const updateSpeakerTimer = () => {
      if (committee.current_timer_end) {
        // Temporizador activo - puede ser negativo
        const endTime = new Date(committee.current_timer_end).getTime();
        const now = Date.now();
        const remaining = Math.floor((endTime - now) / 1000);
        
        // Reproducir sonido cuando llegue a 0 (solo una vez)
        if (remaining <= 0 && speakerTimeLeft > 0) {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmgfCUnA2O6idikGGWO+6+OZUQ0PVqzn77BdGAU+ltryxnkpBSl+zPLaizsIGGy+7eSaUg0OUarg7rdnHgU9l9rzyHkpBSl8yPLaizoIGGy75eabUw4NTqXh8LZjHgU8ltrzxnknBSeAzvLZiToHGGG65OOYTgwPUqzj7bFbGQU9ltrzxnkpBSl8yPDaizwIF2u75uaZUw4NTqXh8LZjHgU8ltrzxnknBSeAzvLZiToHGGG65OOYTgwPUqzj7bFbGQU9ltrzxnkpBSl8yPDaizwIF2u75uaZUw4NTqXh8LZjHgU8ltrzxnknBSeAzvLZiToHGGG65OOYTgwPUqzj7bFbGQU9ltrzxnkpBSl8yPDaizwIF2u75uaZUw4NTqXh8LZjHgU8ltrzxnknBSeAzvLZiToHGGG65OOYTgwPUqzj7bFbGQU9ltrzxnkpBSl8yPDaizwIF2u75uaZUw4NTqXh8LZjHgU8ltrzxnknBSeAzvLZiToHGGG65OOYTgwPUqzj7bFbGQ==');
          audio.play().catch(e => console.log('Audio play failed:', e));
        }
        
        setSpeakerTimeLeft(remaining);
      } else if (committee.current_timer_remaining_seconds !== undefined && committee.current_timer_remaining_seconds !== null) {
        // Temporizador pausado - usar valor guardado (puede ser negativo)
        setSpeakerTimeLeft(committee.current_timer_remaining_seconds);
      } else {
        // Si no hay temporizador activo, mostrar tiempo asignado del orador actual o 0
        if (currentSpeaker) {
          const queueItem = speakingQueue.find(item => 
            item.delegate_id === currentSpeaker.delegate_id && item.status === 'speaking'
          );
          setSpeakerTimeLeft(queueItem?.time_allocated || 0);
        } else {
          setSpeakerTimeLeft(0);
        }
      }
    };

    updateSpeakerTimer();

    if (committee.current_timer_end) {
      const timer = setInterval(updateSpeakerTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [committee, currentSpeaker, speakerTimeLeft, speakingQueue]);

  // Suscripciones en tiempo real optimizadas
  useEffect(() => {
    if (!committeeId) return;

    // Canal unificado para todos los cambios de tiempo real
    const realtimeChannel = supabase
      .channel(`committee-${committeeId}-public-realtime`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'committees',
        filter: `id=eq.${committeeId}`
      }, (payload) => {
        console.log('Public view - Committee update:', payload);
        setCommittee(payload.new as Committee);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'speaking_queue',
        filter: `committee_id=eq.${committeeId}`
      }, async (payload) => {
        console.log('Public view - Speaking queue update:', payload);
        
        // Recargar inmediatamente todos los datos del orador y cola
        try {
          // Cargar orador actual
          const { data: speakerQueueData } = await supabase
            .from('speaking_queue')
            .select('delegate_id, status, started_at, time_allocated, position')
            .eq('committee_id', committeeId)
            .eq('status', 'speaking')
            .maybeSingle();

          if (speakerQueueData) {
            const { data: speakerProfile } = await supabase
              .from('profiles')
              .select('full_name, Photo_url, "Entidad que representa", country_id')
              .eq('id', speakerQueueData.delegate_id)
              .single();

            if (speakerProfile) {
              let countryName = 'Sin país';
              if (speakerProfile.country_id) {
                const { data: country } = await supabase
                  .from('countries')
                  .select('name')
                  .eq('id', speakerProfile.country_id)
                  .single();
                countryName = country?.name || 'Sin país';
              }

              setCurrentSpeaker({
                delegate_id: speakerQueueData.delegate_id,
                status: speakerQueueData.status,
                started_at: speakerQueueData.started_at,
                time_allocated: speakerQueueData.time_allocated,
                position: speakerQueueData.position,
                profiles: {
                  full_name: speakerProfile.full_name,
                  country_name: countryName,
                  photo_url: speakerProfile.Photo_url,
                  'Entidad que representa': speakerProfile['Entidad que representa'] || ''
                }
              });
            }
          } else {
            setCurrentSpeaker(null);
          }

          // Cargar cola pendiente
          const { data: queueData } = await supabase
            .from('speaking_queue')
            .select('delegate_id, status, position')
            .eq('committee_id', committeeId)
            .eq('status', 'pending')
            .order('position');

          if (queueData && queueData.length > 0) {
            const queueWithProfiles = await Promise.all(
              queueData.map(async (item: any) => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('full_name, Photo_url, "Entidad que representa", country_id')
                  .eq('id', item.delegate_id)
                  .single();

                let countryName = 'Sin país';
                if (profile?.country_id) {
                  const { data: country } = await supabase
                    .from('countries')
                    .select('name')
                    .eq('id', profile.country_id)
                    .single();
                  countryName = country?.name || 'Sin país';
                }

                return {
                  delegate_id: item.delegate_id,
                  status: item.status,
                  position: item.position,
                  profiles: {
                    full_name: profile?.full_name || '',
                    country_name: countryName,
                    photo_url: profile?.Photo_url,
                    'Entidad que representa': profile?.['Entidad que representa'] || ''
                  }
                };
              })
            );
            setSpeakingQueue(queueWithProfiles);
          } else {
            setSpeakingQueue([]);
          }
        } catch (error) {
          console.error('Error updating public view data:', error);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `committee_id=eq.${committeeId}`
      }, async () => {
        console.log('Public view - Votes update');
        
        // Recargar el estado del comité para verificar si hay votación activa
        const { data: currentCommittee } = await supabase
          .from('committees')
          .select('current_status')
          .eq('id', committeeId)
          .single();
        
        if (currentCommittee?.current_status === 'voting') {
          const { data: votesData } = await supabase
            .from('votes')
            .select('user_id, vote_type')
            .eq('committee_id', committeeId);

          if (votesData && votesData.length > 0) {
            setIsVotingActive(true);
            const voteMap: { [key: string]: string } = {};
            const counts = { for: 0, against: 0, abstain: 0 };
            votesData.forEach(vote => {
              voteMap[vote.user_id] = vote.vote_type;
              counts[vote.vote_type as keyof typeof counts]++;
            });
            setVotes(voteMap);
            setVoteCount(counts);
          } else {
            setVotes({});
            setVoteCount({ for: 0, against: 0, abstain: 0 });
          }
        } else {
          setIsVotingActive(false);
          setVotes({});
          setVoteCount({ for: 0, against: 0, abstain: 0 });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'secretary_speaking',
        filter: `committee_id=eq.${committeeId}`
      }, async () => {
        console.log('Public view - Secretary speaking update');
        
        const { data: secretaryData } = await supabase
          .from('secretary_speaking')
          .select(`
            id,
            secretary_id,
            is_active,
            started_at,
            profiles!secretary_speaking_secretary_id_fkey (
              full_name
            )
          `)
          .eq('committee_id', committeeId)
          .eq('is_active', true)
          .maybeSingle();

        if (secretaryData) {
          setSecretarySpeaking({
            id: secretaryData.id,
            secretary_id: secretaryData.secretary_id,
            is_active: secretaryData.is_active,
            started_at: secretaryData.started_at,
            profiles: {
              full_name: (secretaryData.profiles as any)?.full_name || 'Secretario'
            }
          });
        } else {
          setSecretarySpeaking(null);
        }
      })
      .subscribe((status) => {
        console.log('Public view realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Public view successfully subscribed to realtime updates');
        }
      });

    return () => {
      console.log('Cleaning up public view realtime subscription');
      supabase.removeChannel(realtimeChannel);
    };
  }, [committeeId]);

  const getDelegateStyle = (delegate: Delegate) => {
    if (isVotingActive) {
      const vote = votes[delegate.id];
      switch (vote) {
        case 'for': return 'bg-primary';
        case 'against': return 'bg-destructive';
        case 'abstain': return 'bg-muted';
        default: return 'bg-muted-foreground';
      }
    }
    return 'bg-muted-foreground';
  };

  if (!committee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const permanentMembers = delegates.filter(d => d.isPermanent);
  const otherMembers = delegates.filter(d => !d.isPermanent);
  const otherMembersCount = otherMembers.length;
  const circleSize = Math.max(40, 110 - otherMembersCount * 5);

  const getStatusMessage = () => {
    switch (committee?.current_status) {
      case 'active': return { text: 'DEBATE ACTIVO', color: 'text-success' };
      case 'paused': return { text: 'DEBATE EN PAUSA', color: 'text-warning' };
      case 'voting': return { text: 'VOTACIÓN EN CURSO', color: 'text-primary' };
      default: return { text: 'COMITÉ INACTIVO', color: 'text-muted-foreground' };
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 md:p-10 font-sans overflow-hidden">
      <header className="w-full mb-4 flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-4xl font-bold tracking-tight">{committee.name}</h1>
          <p className="text-lg text-muted-foreground">{committee.topic}</p>
          <div className={`text-sm font-bold mt-2 ${getStatusMessage().color}`}>
            {getStatusMessage().text}
          </div>
        </div>
        <div className="relative">
          <AnimatePresence mode="wait">
            <CurrentSpeakerHeader 
              key={currentSpeaker ? currentSpeaker.delegate_id : 'no-speaker'} 
              speaker={currentSpeaker}
              secretary={secretarySpeaking}
            />
          </AnimatePresence>
        </div>
      </header>

      <main className="flex-grow bg-card/20 rounded-2xl p-6 flex">
        {/* Panel izquierdo - Cola de oradores */}
        <div className="w-80 pr-6">
          <h3 className="text-xl font-bold mb-4 text-center">Cola de Oradores</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {speakingQueue.map((speaker, index) => (
              <motion.div
                key={speaker.delegate_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 bg-background/50 p-3 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <img 
                  src={speaker.profiles.photo_url || `https://placehold.co/40x40/E5E7EB/1F2937?text=${speaker.profiles.country_name.slice(0, 2)}`}
                  alt={speaker.profiles.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{speaker.profiles.country_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{speaker.profiles.full_name}</p>
                </div>
              </motion.div>
            ))}
            {speakingQueue.length === 0 && (
              <p className="text-center text-muted-foreground">No hay oradores en cola</p>
            )}
          </div>
        </div>

          {/* Agenda Display */}
          <div className="mb-6">
            <PublicAgendaDisplay committeeId={committeeId} />
          </div>

          {/* Speaking Queue */}
        <div className="flex-1 flex flex-col justify-center items-center">
          {isVotingActive && (
            <div className="mb-8 bg-primary/10 rounded-2xl p-6 text-center">
              <h3 className="text-2xl font-bold text-primary mb-4">VOTACIÓN EN CURSO</h3>
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-success">{voteCount.for}</div>
                  <div className="text-sm text-muted-foreground">A Favor</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-destructive">{voteCount.against}</div>
                  <div className="text-sm text-muted-foreground">En Contra</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">{voteCount.abstain}</div>
                  <div className="text-sm text-muted-foreground">Abstención</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-8 mb-8">
            {permanentMembers.map(delegate => (
              <motion.div 
                key={delegate.id} 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 * delegates.indexOf(delegate) }} 
                className="flex flex-col items-center justify-center"
              >
                <div 
                  style={{ width: '64px', height: '64px' }}
                  className={`rounded-full transition-all duration-500 ${getDelegateStyle(delegate)} ring-offset-4 ring-offset-background ${
                    currentSpeaker?.delegate_id === delegate.id 
                      ? 'ring-4 ring-success' 
                      : 'ring-2 ring-warning'
                  }`} 
                />
                <span className="text-sm font-semibold text-muted-foreground mt-2 text-center w-24">
                  {delegate.country_name}
                </span>
              </motion.div>
            ))}
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-4">
            {otherMembers.map(delegate => (
              <motion.div 
                key={delegate.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.05 * delegates.indexOf(delegate) }} 
                className="flex flex-col items-center justify-center"
              >
                <div 
                  style={{ width: `${circleSize}px`, height: `${circleSize}px` }}
                  className={`rounded-full transition-all duration-500 ${getDelegateStyle(delegate)} ${
                    currentSpeaker?.delegate_id === delegate.id 
                      ? 'ring-4 ring-offset-4 ring-offset-background ring-success' 
                      : ''
                  }`}
                />
                <span 
                  style={{width: `${circleSize}px`}} 
                  className="text-xs text-muted-foreground mt-2 text-center truncate"
                >
                  {delegate.country_name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full mt-6 flex justify-center">
        <div className="bg-card/20 p-4 rounded-2xl">
          <TimerDisplay 
            sessionTime={sessionTime} 
            speakerTimeLeft={speakerTimeLeft}
          />
        </div>
      </footer>
    </div>
  );
}
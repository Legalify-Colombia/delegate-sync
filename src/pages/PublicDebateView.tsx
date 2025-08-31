import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

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
    const date = new Date(absSeconds * 1000).toISOString().substr(11, 8);
    return isNegative ? `-${date}` : date;
  };

  const getSpeakerTimeColor = () => {
    if (speakerTimeLeft <= 0) return 'text-destructive';
    if (speakerTimeLeft <= 10) return 'text-destructive';
    if (speakerTimeLeft <= 30) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="flex divide-x divide-border">
      <div className="px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">Tiempo de Sesión</p>
        <p className="text-5xl font-bold tracking-tighter text-foreground">{formatTime(sessionTime)}</p>
      </div>
      <div className="px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">Tiempo de Intervención</p>
        <p className={`text-5xl font-bold tracking-tighter transition-colors ${getSpeakerTimeColor()}`}>
          {formatTime(speakerTimeLeft)}
        </p>
      </div>
    </div>
  );
};

// Componente para mostrar al orador actual
const CurrentSpeakerHeader = ({ speaker, isMotion }: { speaker: SpeakingQueue | null; isMotion?: boolean }) => {
  if (!speaker) return <div className="min-w-[400px] h-[116px]"></div>;

  return (
    <motion.div
      key={speaker.delegate_id}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex items-center gap-4 bg-background/20 p-3 rounded-2xl"
    >
      <img 
        src={speaker.profiles.photo_url || `https://placehold.co/128x128/E5E7EB/1F2937?text=${speaker.profiles.country_name.slice(0, 3).toUpperCase()}`} 
        alt={speaker.profiles.full_name} 
        className="w-20 h-20 rounded-full ring-4 ring-success object-cover" 
      />
      <div>
        <AnimatePresence>
          {isMotion && 
            <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="flex items-center gap-2 text-warning font-bold text-sm">
              <Gavel size={14}/> MOCIÓN DE ORDEN
            </motion.div>
          }
        </AnimatePresence>
        <p className="text-3xl font-bold">{speaker.profiles.country_name}</p>
        <p className="text-md text-muted-foreground">{speaker.profiles.full_name}</p>
        <p className="text-xs text-muted-foreground">{speaker.profiles['Entidad que representa']}</p>
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

      // Cargar orador actual y cola
      const { data: speakerData } = await supabase
        .from('speaking_queue')
        .select(`
          delegate_id,
          status,
          started_at,
          time_allocated,
          position,
          profiles!speaking_queue_delegate_id_fkey (
            full_name,
            Photo_url,
            "Entidad que representa",
            countries!profiles_country_id_fkey (name)
          )
        `)
        .eq('committee_id', committeeId)
        .eq('status', 'speaking')
        .maybeSingle();

      const { data: queueData } = await supabase
        .from('speaking_queue')
        .select(`
          delegate_id,
          status,
          position,
          profiles!speaking_queue_delegate_id_fkey (
            full_name,
            Photo_url,
            "Entidad que representa",
            countries!profiles_country_id_fkey (name)
          )
        `)
        .eq('committee_id', committeeId)
        .eq('status', 'pending')
        .order('position');

      if (speakerData) {
        const formattedSpeaker = {
          delegate_id: (speakerData as any).delegate_id,
          status: (speakerData as any).status,
          started_at: (speakerData as any).started_at,
          time_allocated: (speakerData as any).time_allocated,
          position: (speakerData as any).position,
          profiles: {
            full_name: (speakerData as any).profiles?.full_name || '',
            country_name: (speakerData as any).profiles?.countries?.name || '',
            photo_url: (speakerData as any).profiles?.Photo_url,
            'Entidad que representa': (speakerData as any).profiles?.['Entidad que representa'] || ''
          }
        };
        setCurrentSpeaker(formattedSpeaker);
      }

      if (queueData) {
        const formattedQueue = queueData.map((item: any) => ({
          delegate_id: item.delegate_id,
          status: item.status,
          position: item.position,
          profiles: {
            full_name: item.profiles?.full_name || '',
            country_name: item.profiles?.countries?.name || '',
            photo_url: item.profiles?.Photo_url,
            'Entidad que representa': item.profiles?.['Entidad que representa'] || ''
          }
        }));
        setSpeakingQueue(formattedQueue);
      }

      // Actualizar conteos de votos
      if (votesData && votesData.length > 0) {
        const counts = { for: 0, against: 0, abstain: 0 };
        votesData.forEach(vote => {
          counts[vote.vote_type as keyof typeof counts]++;
        });
        setVoteCount(counts);
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

  // Timer del orador - basado en temporizador del comité
  useEffect(() => {
    if (!committee) return;

    const updateSpeakerTimer = () => {
      if (committee.current_timer_end) {
        // Temporizador activo
        const endTime = new Date(committee.current_timer_end).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setSpeakerTimeLeft(remaining);
      } else if (committee.current_timer_remaining_seconds) {
        // Temporizador pausado
        setSpeakerTimeLeft(committee.current_timer_remaining_seconds);
      } else {
        setSpeakerTimeLeft(0);
      }
    };

    updateSpeakerTimer();

    if (committee.current_timer_end) {
      const timer = setInterval(updateSpeakerTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [committee]);

  // Suscripciones en tiempo real
  useEffect(() => {
    if (!committeeId) return;

    // Suscripción a cambios en el comité
    const committeeChannel = supabase
      .channel('committee-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'committees',
        filter: `id=eq.${committeeId}`
      }, (payload) => {
        setCommittee(payload.new as Committee);
      })
      .subscribe();

    // Suscripción a cambios en la cola de oradores
    const speakingChannel = supabase
      .channel('speaking-queue-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'speaking_queue',
        filter: `committee_id=eq.${committeeId}`
      }, async (payload) => {
        // Recargar orador actual y cola
        const { data: speakerData } = await supabase
          .from('speaking_queue')
          .select(`
            delegate_id,
            status,
            started_at,
            time_allocated,
            position,
            profiles!speaking_queue_delegate_id_fkey (
              full_name,
              Photo_url,
              "Entidad que representa",
              countries!profiles_country_id_fkey (name)
            )
          `)
          .eq('committee_id', committeeId)
          .eq('status', 'speaking')
          .maybeSingle();

        const { data: queueData } = await supabase
          .from('speaking_queue')
          .select(`
            delegate_id,
            status,
            position,
            profiles!speaking_queue_delegate_id_fkey (
              full_name,
              Photo_url,
              "Entidad que representa",
              countries!profiles_country_id_fkey (name)
            )
          `)
          .eq('committee_id', committeeId)
          .eq('status', 'pending')
          .order('position');

        if (speakerData) {
          const formattedSpeaker = {
            delegate_id: (speakerData as any).delegate_id,
            status: (speakerData as any).status,
            started_at: (speakerData as any).started_at,
            time_allocated: (speakerData as any).time_allocated,
            position: (speakerData as any).position,
            profiles: {
              full_name: (speakerData as any).profiles?.full_name || '',
              country_name: (speakerData as any).profiles?.countries?.name || '',
              photo_url: (speakerData as any).profiles?.Photo_url,
              'Entidad que representa': (speakerData as any).profiles?.['Entidad que representa'] || ''
            }
          };
          setCurrentSpeaker(formattedSpeaker);
        } else {
          setCurrentSpeaker(null);
        }

        if (queueData) {
          const formattedQueue = queueData.map((item: any) => ({
            delegate_id: item.delegate_id,
            status: item.status,
            position: item.position,
            profiles: {
              full_name: item.profiles?.full_name || '',
              country_name: item.profiles?.countries?.name || '',
              photo_url: item.profiles?.Photo_url,
              'Entidad que representa': item.profiles?.['Entidad que representa'] || ''
            }
          }));
          setSpeakingQueue(formattedQueue);
        }
      })
      .subscribe();

    // Suscripción a votos
    const votesChannel = supabase
      .channel('votes-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `committee_id=eq.${committeeId}`
      }, async () => {
        // Recargar todos los votos
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
          setIsVotingActive(false);
          setVotes({});
          setVoteCount({ for: 0, against: 0, abstain: 0 });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(committeeChannel);
      supabase.removeChannel(speakingChannel);
      supabase.removeChannel(votesChannel);
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

        {/* Panel central - Representación de delegados */}
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
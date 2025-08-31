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
  const [sessionTime, setSessionTime] = useState(0);
  const [speakerTimeLeft, setSpeakerTimeLeft] = useState(0);
  const [isVotingActive, setIsVotingActive] = useState(false);

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

      // Cargar orador actual
      const { data: speakerData } = await supabase
        .from('speaking_queue')
        .select(`
          delegate_id,
          status,
          started_at,
          time_allocated,
          profiles!speaking_queue_delegate_id_fkey (
            full_name,
            Photo_url,
            "Entidad que representa",
            countries!profiles_country_id_fkey (name)
          )
        `)
        .eq('committee_id', committeeId)
        .eq('status', 'speaking')
        .single();

      if (speakerData) {
        const formattedSpeaker = {
          delegate_id: (speakerData as any).delegate_id,
          status: (speakerData as any).status,
          started_at: (speakerData as any).started_at,
          time_allocated: (speakerData as any).time_allocated,
          profiles: {
            full_name: (speakerData as any).profiles?.full_name || '',
            country_name: (speakerData as any).profiles?.countries?.name || '',
            photo_url: (speakerData as any).profiles?.Photo_url,
            'Entidad que representa': (speakerData as any).profiles?.['Entidad que representa'] || ''
          }
        };
        setCurrentSpeaker(formattedSpeaker);
        
        if ((speakerData as any).started_at && (speakerData as any).time_allocated) {
          const startTime = new Date((speakerData as any).started_at).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          setSpeakerTimeLeft(Math.max(0, (speakerData as any).time_allocated - elapsed));
        }
      }
    };

    loadInitialData();
  }, [committeeId]);

  // Timer de sesión - solo cuando el comité está activo
  useEffect(() => {
    if (committee?.current_status === 'active') {
      const interval = setInterval(() => setSessionTime(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [committee?.current_status]);

  // Timer del orador - basado en tiempo real
  useEffect(() => {
    if (currentSpeaker && currentSpeaker.started_at && currentSpeaker.time_allocated) {
      const updateTimer = () => {
        const startTime = new Date(currentSpeaker.started_at!).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = Math.max(0, currentSpeaker.time_allocated! - elapsed);
        setSpeakerTimeLeft(remaining);
      };

      updateTimer(); // Actualizar inmediatamente
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    } else {
      setSpeakerTimeLeft(0);
    }
  }, [currentSpeaker]);

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
        if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'speaking') {
          // Cargar datos completos del nuevo orador
          const { data: speakerData } = await supabase
            .from('speaking_queue')
            .select(`
              delegate_id,
              status,
              started_at,
              time_allocated,
              profiles!speaking_queue_delegate_id_fkey (
                full_name,
                Photo_url,
                "Entidad que representa",
                countries!profiles_country_id_fkey (name)
              )
            `)
            .eq('id', (payload.new as any).id)
            .single();

          if (speakerData) {
            const formattedSpeaker = {
              delegate_id: (speakerData as any).delegate_id,
              status: (speakerData as any).status,
              started_at: (speakerData as any).started_at,
              time_allocated: (speakerData as any).time_allocated,
              profiles: {
                full_name: (speakerData as any).profiles?.full_name || '',
                country_name: (speakerData as any).profiles?.countries?.name || '',
                photo_url: (speakerData as any).profiles?.Photo_url,
                'Entidad que representa': (speakerData as any).profiles?.['Entidad que representa'] || ''
              }
            };
            setCurrentSpeaker(formattedSpeaker);
            setSpeakerTimeLeft((speakerData as any).time_allocated || 0);
          }
        } else if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'completed') {
          setCurrentSpeaker(null);
          setSpeakerTimeLeft(0);
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
          votesData.forEach(vote => {
            voteMap[vote.user_id] = vote.vote_type;
          });
          setVotes(voteMap);
        } else {
          setIsVotingActive(false);
          setVotes({});
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 md:p-10 font-sans overflow-hidden">
      <header className="w-full mb-4 flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-4xl font-bold tracking-tight">{committee.name}</h1>
          <p className="text-lg text-muted-foreground">{committee.topic}</p>
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

      <main className="flex-grow bg-card/20 rounded-2xl p-6 flex flex-col justify-center items-center">
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
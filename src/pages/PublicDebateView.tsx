import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, FileText, Users as UsersIcon, Clock, Mic, Calendar, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { Logo } from '@/components/ui/logo';

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
  time_allocated: number;
  started_at?: string;
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

// Componente de Temporizadores Compacto
const CompactTimerDisplay = ({ 
  sessionTime, 
  speakerTimeLeft, 
  agendaItem 
}: { 
  sessionTime: number; 
  speakerTimeLeft: number; 
  agendaItem?: { title: string; started_at?: string; time_allocated: number } | null;
}) => {
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

  const calculateAgendaTime = () => {
    if (!agendaItem?.started_at) return 0;
    const startTime = new Date(agendaItem.started_at).getTime();
    const currentTime = Date.now();
    return Math.floor((currentTime - startTime) / 1000);
  };

  const getAgendaTimeColor = (usedTime: number, allocatedTime: number) => {
    const ratio = usedTime / allocatedTime;
    if (ratio >= 1) return 'text-destructive';
    if (ratio >= 0.8) return 'text-warning';
    return 'text-orange-500';
  };

  const agendaUsedTime = calculateAgendaTime();

  return (
    <div className="flex flex-col gap-3 bg-card/40 backdrop-blur-sm p-4 rounded-xl border border-border/50">
      {/* Tiempo de Sesión */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase">Sesión</span>
        </div>
        <div className="text-2xl font-bold text-blue-500">{formatTime(sessionTime)}</div>
      </div>
      
      {/* Separador */}
      <div className="h-px bg-border/50" />
      
      {/* Tiempo de Intervención */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase">Orador</span>
        </div>
        <div className={`text-2xl font-bold transition-colors ${getSpeakerTimeColor()}`}>
          {formatTime(speakerTimeLeft)}
        </div>
        {speakerTimeLeft < 0 && (
          <div className="text-xs text-destructive font-medium mt-1">EXCEDIDO</div>
        )}
      </div>

      {/* Tiempo de Agenda (solo si hay agenda activa) */}
      {agendaItem && (
        <>
          <div className="h-px bg-border/50" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FileText className="h-3 w-3 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Resolución</span>
            </div>
            <div className="text-sm font-semibold text-foreground mb-1 line-clamp-1">
              {agendaItem.title}
            </div>
            <div className={`text-lg font-bold transition-colors ${
              getAgendaTimeColor(agendaUsedTime, agendaItem.time_allocated)
            }`}>
              {formatTime(agendaUsedTime)}
            </div>
            <div className="text-xs text-muted-foreground">
              de {formatTime(agendaItem.time_allocated)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Componente de Cola Compacta
const CompactSpeakingQueue = ({ queue }: { queue: SpeakingQueue[] }) => {
  return (
    <div className="bg-card/40 backdrop-blur-sm p-4 rounded-xl border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <UsersIcon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Cola de Oradores</h3>
        <div className="ml-auto bg-primary/20 text-primary px-2 py-1 rounded-full text-xs font-medium">
          {queue.length}
        </div>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
        {queue.slice(0, 8).map((speaker, index) => (
          <motion.div
            key={speaker.delegate_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2 bg-background/60 p-2 rounded-lg"
          >
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {index + 1}
            </div>
            <img 
              src={speaker.profiles.photo_url || `https://placehold.co/24x24/E5E7EB/1F2937?text=${speaker.profiles.country_name.slice(0, 2)}`}
              alt={speaker.profiles.full_name}
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{speaker.profiles.country_name}</p>
              <p className="text-xs text-muted-foreground truncate">{speaker.profiles.full_name}</p>
            </div>
          </motion.div>
        ))}
        {queue.length === 0 && (
          <p className="text-center text-muted-foreground text-xs py-4">No hay oradores en cola</p>
        )}
        {queue.length > 8 && (
          <div className="text-center text-xs text-muted-foreground py-1">
            +{queue.length - 8} más...
          </div>
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
    console.log('Showing secretary speaker:', secretary);
    return (
      <motion.div
        key={`secretary-${secretary.secretary_id}`}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl min-w-[300px] lg:min-w-[400px]"
      >
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full ring-4 ring-blue-500 bg-blue-500/20 flex items-center justify-center">
          <Mic className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-medium text-blue-500 uppercase tracking-wide">SECRETARIO HABLANDO</span>
          </div>
          <p className="text-lg lg:text-2xl font-bold text-foreground mb-1">Secretario de Comité</p>
          <p className="text-sm lg:text-lg text-muted-foreground font-medium">{secretary.profiles.full_name}</p>
          <p className="text-xs lg:text-sm text-muted-foreground">Moderando la sesión</p>
          {secretary.started_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Desde: {new Date(secretary.started_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  if (!speaker) return (
    <div className="min-w-[300px] lg:min-w-[400px] h-[100px] lg:h-[116px] bg-background/20 rounded-2xl flex items-center justify-center">
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
      className="flex items-center gap-4 bg-success/10 border border-success/20 p-4 rounded-2xl min-w-[300px] lg:min-w-[400px]"
    >
      <img 
        src={speaker.profiles.photo_url || `https://placehold.co/128x128/10B981/FFFFFF?text=${speaker.profiles.country_name.slice(0, 3).toUpperCase()}`} 
        alt={speaker.profiles.full_name} 
        className="w-16 h-16 lg:w-20 lg:h-20 rounded-full ring-4 ring-success object-cover" 
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
        <p className="text-lg lg:text-2xl font-bold text-foreground mb-1">{speaker.profiles.country_name}</p>
        <p className="text-sm lg:text-lg text-muted-foreground font-medium">{speaker.profiles.full_name}</p>
        <p className="text-xs lg:text-sm text-muted-foreground">{speaker.profiles['Entidad que representa']}</p>
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
        .select('*')
        .eq('committee_id', committeeId)
        .eq('is_active', true)
        .maybeSingle();

      if (secretaryData) {
        // Cargar perfil del secretario por separado
        const { data: secretaryProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', secretaryData.secretary_id)
          .single();

        setSecretarySpeaking({
          id: secretaryData.id,
          secretary_id: secretaryData.secretary_id,
          is_active: secretaryData.is_active,
          started_at: secretaryData.started_at,
          profiles: {
            full_name: secretaryProfile?.full_name || 'Secretario de Comité'
          }
        });
      } else {
        setSecretarySpeaking(null);
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
          .select('*')
          .eq('committee_id', committeeId)
          .eq('is_active', true)
          .maybeSingle();

        if (secretaryData) {
          // Cargar perfil del secretario por separado
          const { data: secretaryProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', secretaryData.secretary_id)
            .single();

          setSecretarySpeaking({
            id: secretaryData.id,
            secretary_id: secretaryData.secretary_id,
            is_active: secretaryData.is_active,
            started_at: secretaryData.started_at,
            profiles: {
              full_name: secretaryProfile?.full_name || 'Secretario de Comité'
            }
          });
        } else {
          setSecretarySpeaking(null);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agenda_items',
        filter: `committee_id=eq.${committeeId}`
      }, async () => {
        console.log('Public view - Agenda items update');
        
        const { data: agendaData } = await supabase
          .from('agenda_items')
          .select('*')
          .eq('committee_id', committeeId)
          .order('position');

        if (agendaData) {
          setAgendaItems(agendaData as AgendaItem[]);
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

  const getStatusMessage = () => {
    switch (committee?.current_status) {
      case 'active': return { text: 'DEBATE ACTIVO', color: 'text-success' };
      case 'paused': return { text: 'DEBATE EN PAUSA', color: 'text-warning' };
      case 'voting': return { text: 'VOTACIÓN EN CURSO', color: 'text-primary' };
      default: return { text: 'COMITÉ INACTIVO', color: 'text-muted-foreground' };
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 text-foreground flex flex-col font-sans overflow-hidden">
      {/* Header mejorado con logo */}
      <header className="w-full p-4 bg-card/20 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo y título */}
          <div className="flex items-center gap-6">
            <Logo size="lg" className="flex-shrink-0" />
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{committee?.name}</h1>
              <p className="text-sm md:text-base text-muted-foreground">{committee?.topic}</p>
              <div className={`text-xs font-bold mt-1 ${getStatusMessage().color} flex items-center gap-1`}>
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {getStatusMessage().text}
              </div>
            </div>
          </div>
          
          {/* Orador actual - Solo desktop */}
          <div className="hidden lg:block">
            <AnimatePresence mode="wait">
              <CurrentSpeakerHeader 
                key={currentSpeaker ? currentSpeaker.delegate_id : 'no-speaker'} 
                speaker={currentSpeaker}
                secretary={secretarySpeaking}
              />
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Orador actual móvil */}
      <div className="lg:hidden px-4 py-3 bg-card/10 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          <CurrentSpeakerHeader 
            key={currentSpeaker ? currentSpeaker.delegate_id : 'no-speaker'} 
            speaker={currentSpeaker}
            secretary={secretarySpeaking}
          />
        </AnimatePresence>
      </div>

      {/* Layout principal reorganizado */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 flex gap-4">
        {/* Panel lateral izquierdo - Información (solo desktop) */}
        <div className="w-72 space-y-4 hidden xl:block">
          <CompactTimerDisplay 
            sessionTime={sessionTime} 
            speakerTimeLeft={speakerTimeLeft}
            agendaItem={agendaItems.find(item => item.is_active) || null}
          />
          <CompactSpeakingQueue queue={speakingQueue} />
        </div>

        {/* Área central - Representación visual de delegados */}
        <div className="flex-1 flex flex-col justify-center items-center relative">
          {/* Panel móvil - Información compacta (tablet/mobile) */}
          <div className="xl:hidden w-full mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CompactTimerDisplay 
                sessionTime={sessionTime} 
                speakerTimeLeft={speakerTimeLeft}
                agendaItem={agendaItems.find(item => item.is_active) || null}
              />
              <CompactSpeakingQueue queue={speakingQueue} />
            </div>
          </div>

          {/* Votación activa */}
          {isVotingActive && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-primary/20"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Gavel className="h-6 w-6 text-primary animate-pulse" />
                <h3 className="text-2xl font-bold text-primary">VOTACIÓN EN CURSO</h3>
              </div>
              <div className="flex justify-center gap-8">
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-3xl font-bold text-success">{voteCount.for}</div>
                  <div className="text-sm text-muted-foreground">A Favor</div>
                </motion.div>
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-3xl font-bold text-destructive">{voteCount.against}</div>
                  <div className="text-sm text-muted-foreground">En Contra</div>
                </motion.div>
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-3xl font-bold text-muted-foreground">{voteCount.abstain}</div>
                  <div className="text-sm text-muted-foreground">Abstención</div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Miembros permanentes del Consejo de Seguridad */}
          {permanentMembers.length > 0 && (
            <div className="mb-8">
              <div className="text-center mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Miembros Permanentes
                </h3>
              </div>
              <div className="flex justify-center gap-8">
                {permanentMembers.map((delegate, index) => (
                  <motion.div 
                    key={delegate.id} 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="relative">
                      <div 
                        className={`w-16 h-16 rounded-full transition-all duration-500 ${getDelegateStyle(delegate)} ${
                          currentSpeaker?.delegate_id === delegate.id 
                            ? 'ring-4 ring-success ring-offset-4 ring-offset-background shadow-lg shadow-success/25' 
                            : 'ring-2 ring-warning group-hover:ring-4 group-hover:ring-offset-2 group-hover:ring-offset-background'
                        }`} 
                      />
                      {currentSpeaker?.delegate_id === delegate.id && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                          <Mic className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-center w-20 mt-2 group-hover:text-primary transition-colors">
                      {delegate.country_name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {/* Otros miembros */}
          {otherMembers.length > 0 && (
            <div className="w-full">
              <div className="text-center mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Miembros No Permanentes ({otherMembers.length})
                </h3>
              </div>
              <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
                {otherMembers.map((delegate, index) => (
                  <motion.div 
                    key={delegate.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ scale: 1.05 }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="relative">
                      <div 
                        style={{ width: `${circleSize}px`, height: `${circleSize}px` }}
                        className={`rounded-full transition-all duration-500 ${getDelegateStyle(delegate)} ${
                          currentSpeaker?.delegate_id === delegate.id 
                            ? 'ring-4 ring-success ring-offset-4 ring-offset-background shadow-lg shadow-success/25' 
                            : 'group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background'
                        }`}
                      />
                      {currentSpeaker?.delegate_id === delegate.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center">
                          <Mic className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <span 
                      style={{width: `${Math.max(circleSize, 80)}px`}} 
                      className="text-xs text-center mt-2 truncate group-hover:text-primary transition-colors"
                      title={delegate.country_name}
                    >
                      {delegate.country_name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Estilos CSS para el scroll personalizado */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgb(203 213 225) transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgb(203 213 225);
          border-radius: 2px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgb(148 163 184);
        }
      `}</style>
    </div>
  );
}
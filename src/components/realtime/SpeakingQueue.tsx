import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Hand, Play, Square, Clock, CheckCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface QueueEntry {
  id: string;
  delegate_id: string;
  position: number;
  status: 'pending' | 'speaking' | 'completed';
  requested_at: string;
  time_allocated: number;
  profiles: {
    full_name: string;
    countries?: { name: string };
  };
}

interface SpeakingQueueProps {
  committeeId: string;
  isSecretary?: boolean;
}

export default function SpeakingQueue({ committeeId, isSecretary = false }: SpeakingQueueProps) {
  const { profile } = useAuth();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSpeaker, setCurrentSpeaker] = useState<QueueEntry | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (committeeId) {
      fetchQueue();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('speaking_queue_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'speaking_queue',
            filter: `committee_id=eq.${committeeId}`
          },
          () => {
            fetchQueue();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [committeeId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isTimerRunning && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playAlertSound();
            if (isSecretary && currentSpeaker) {
              completeSpeaker(currentSpeaker.id);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, timeRemaining, currentSpeaker, isSecretary]);

  const fetchQueue = async () => {
    try {
      // Fetch queue entries without joins to avoid FK name dependency
      const { data: queueData, error: qErr } = await supabase
        .from('speaking_queue')
        .select('*')
        .eq('committee_id', committeeId)
        .order('position', { ascending: true });

      if (qErr) {
        console.error('Error fetching queue:', qErr);
        setLoading(false);
        return;
      }

      const queueEntries = (queueData as any[]) || [];
      const delegateIds = Array.from(new Set(queueEntries.map((e: any) => e.delegate_id)));

      let profilesMap: Record<string, { full_name: string; countries?: { name: string } } > = {};
      if (delegateIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', delegateIds);

        (profilesData as any[] | null)?.forEach((p: any) => {
          profilesMap[p.id] = { full_name: p.full_name };
        });
      }

      const merged = queueEntries.map((e: any) => ({
        ...e,
        profiles: profilesMap[e.delegate_id] || { full_name: 'Desconocido' },
      }));

      setQueue(merged as any);
      const speaking = (merged as any[])?.find((entry: any) => entry.status === 'speaking');
      setCurrentSpeaker((speaking as any) || null);
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const requestToSpeak = async () => {
    if (!profile) return;

    // Check if user already has a pending request
    const existingRequest = queue.find(entry => 
      entry.delegate_id === profile.id && entry.status === 'pending'
    );

    if (existingRequest) {
      toast({
        title: "Ya solicitaste turno",
        description: "Ya tienes una solicitud pendiente en la cola",
        variant: "destructive",
      });
      return;
    }

    const nextPosition = Math.max(...queue.map(entry => entry.position), 0) + 1;

    const { error } = await supabase
      .from('speaking_queue')
      .insert({
        committee_id: committeeId,
        delegate_id: profile.id,
        position: nextPosition,
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo solicitar el turno",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Turno solicitado",
        description: "Tu solicitud ha sido agregada a la cola",
      });
    }
  };

  const startSpeaker = async (entryId: string, timeAllocated: number = 120) => {
    // Stop current speaker if any
    if (currentSpeaker) {
      await completeSpeaker(currentSpeaker.id);
    }

    const { error } = await supabase
      .from('speaking_queue')
      .update({
        status: 'speaking',
        started_at: new Date().toISOString(),
        time_allocated: timeAllocated
      })
      .eq('id', entryId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo iniciar el turno",
        variant: "destructive",
      });
    } else {
      setTimeRemaining(timeAllocated);
      setIsTimerRunning(true);
      toast({
        title: "Turno iniciado",
        description: `Tiempo asignado: ${Math.floor(timeAllocated / 60)}:${(timeAllocated % 60).toString().padStart(2, '0')}`,
      });
    }
  };

  const completeSpeaker = async (entryId: string) => {
    const { error } = await supabase
      .from('speaking_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo completar el turno",
        variant: "destructive",
      });
    } else {
      setIsTimerRunning(false);
      setTimeRemaining(0);
    }
  };

  const playAlertSound = () => {
    // Create audio context for alert sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Play 3 beeps
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.setValueAtTime(800, audioContext.currentTime);
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      osc2.start();
      osc2.stop(audioContext.currentTime + 0.5);
    }, 600);
    
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.setValueAtTime(800, audioContext.currentTime);
      gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
      osc3.start();
      osc3.stop(audioContext.currentTime + 0.5);
    }, 1200);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="flex justify-center p-4">Cargando cola de intervenciones...</div>;
  }

  const pendingQueue = queue.filter(entry => entry.status === 'pending');
  const userInQueue = queue.find(entry => 
    entry.delegate_id === profile?.id && entry.status === 'pending'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Cola de Intervenciones</span>
        </CardTitle>
        <CardDescription>
          {isSecretary ? 'Gestiona el orden de las intervenciones' : 'Solicita tu turno para hablar'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Speaker */}
        {currentSpeaker && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Hablando Ahora</span>
              </h4>
              {isTimerRunning && (
                <div className="flex items-center space-x-2 text-primary font-mono">
                  <Clock className="h-4 w-4" />
                  <span className="text-lg">{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{currentSpeaker.profiles.full_name}</p>
                {currentSpeaker.profiles.countries && (
                  <p className="text-sm text-muted-foreground">
                    {currentSpeaker.profiles.countries.name}
                  </p>
                )}
              </div>
              {isSecretary && (
                <Button
                  onClick={() => completeSpeaker(currentSpeaker.id)}
                  variant="outline"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Request to Speak Button (for delegates) */}
        {!isSecretary && profile?.role === 'delegate' && (
          <div className="flex justify-center">
            <Button
              onClick={requestToSpeak}
              disabled={!!userInQueue}
              className="w-full sm:w-auto"
            >
              <Hand className="h-4 w-4 mr-2" />
              {userInQueue ? 'Ya solicitaste turno' : 'Solicitar Turno'}
            </Button>
          </div>
        )}

        {/* Queue List */}
        {pendingQueue.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-semibold">Cola de Espera ({pendingQueue.length})</h4>
            {pendingQueue.map((entry, index) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <div>
                    <p className="font-medium">{entry.profiles.full_name}</p>
                    {entry.profiles.countries && (
                      <p className="text-sm text-muted-foreground">
                        {entry.profiles.countries.name}
                      </p>
                    )}
                  </div>
                </div>
                {isSecretary && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => startSpeaker(entry.id, 120)}
                      size="sm"
                      variant="outline"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Dar Voz (2 min)
                    </Button>
                    <Button
                      onClick={() => startSpeaker(entry.id, 60)}
                      size="sm"
                      variant="outline"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      1 min
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No hay solicitudes de turno pendientes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
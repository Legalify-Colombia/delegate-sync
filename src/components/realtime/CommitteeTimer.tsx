import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentModel } from '@/hooks/useCurrentModel';

interface CommitteeTimerProps {
  committeeId: string;
  isSecretary?: boolean;
}

export default function CommitteeTimer({ committeeId, isSecretary = false }: CommitteeTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [inputMinutes, setInputMinutes] = useState(5);
  const { toast } = useToast();
  const { currentModel } = useCurrentModel();

  useEffect(() => {
    // Subscribe to committee changes for real-time updates
    const channel = supabase
      .channel('committee-timer')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'committees',
          filter: `id=eq.${committeeId}`,
        },
        (payload) => {
          if (payload.new.current_timer_end) {
            const endTime = new Date(payload.new.current_timer_end).getTime();
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimeLeft(remaining);
            setIsRunning(remaining > 0);
          } else {
            setTimeLeft(0);
            setIsRunning(false);
          }
        }
      )
      .subscribe();

    // Initial load
    fetchTimerState();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [committeeId]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (isSecretary) {
              toast({
                title: "Tiempo Agotado",
                description: "El tiempo del debate ha terminado",
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRunning, timeLeft, isSecretary, toast]);

  const fetchTimerState = async () => {
    const { data, error } = await supabase
      .from('committees')
      .select('current_timer_end')
      .eq('id', committeeId)
      .single();

    if (!error && data?.current_timer_end) {
      const endTime = new Date(data.current_timer_end).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);
      setIsRunning(remaining > 0);
    }
  };

  const startTimer = async () => {
    // First check if there's a current speaker with assigned time
    const { data: currentSpeaker } = await supabase
      .from('speaking_queue')
      .select('time_allocated')
      .eq('committee_id', committeeId)
      .eq('status', 'speaking')
      .single();

    // Use the speaker's assigned time if available, otherwise use input minutes
    const durationSeconds = currentSpeaker?.time_allocated || (inputMinutes * 60);
    const endTime = new Date(Date.now() + durationSeconds * 1000);
    
    const { error } = await supabase
      .from('committees')
      .update({ current_timer_end: endTime.toISOString() })
      .eq('id', committeeId);

    if (!error) {
      // Log the event
      await supabase
        .from('debate_log')
        .insert({
          committee_id: committeeId,
          event_type: 'timer_start',
          model_id: currentModel?.id || '',
          details: { 
            duration_minutes: Math.floor(durationSeconds / 60),
            duration_seconds: durationSeconds,
            source: currentSpeaker ? 'speaker_assigned' : 'manual_input'
          }
        });

      setTimeLeft(durationSeconds);
      setIsRunning(true);
    }
  };

  const pauseTimer = async () => {
    const { error } = await supabase
      .from('committees')
      .update({ current_timer_end: null })
      .eq('id', committeeId);

    if (!error) {
      await supabase
        .from('debate_log')
        .insert({
          committee_id: committeeId,
          event_type: 'timer_pause',
          model_id: currentModel?.id || '',
          details: { remaining_seconds: timeLeft }
        });

      setIsRunning(false);
    }
  };

  const stopTimer = async () => {
    const { error } = await supabase
      .from('committees')
      .update({ current_timer_end: null })
      .eq('id', committeeId);

    if (!error) {
      setTimeLeft(0);
      setIsRunning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl font-mono font-bold mb-2 flex items-center justify-center space-x-2">
          <Clock className="h-8 w-8" />
          <span className={timeLeft <= 60 && isRunning ? 'text-destructive' : 'text-foreground'}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {isRunning ? 'Temporizador en curso' : 'Temporizador detenido'}
        </div>
      </div>

      {isSecretary && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              min="1"
              max="60"
              value={inputMinutes}
              onChange={(e) => setInputMinutes(Number(e.target.value))}
              className="w-20"
              disabled={isRunning}
            />
            <span className="text-sm text-muted-foreground">minutos</span>
          </div>

          <div className="flex space-x-2">
            {!isRunning ? (
              <Button onClick={startTimer} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
            ) : (
              <Button onClick={pauseTimer} variant="outline" className="flex-1">
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </Button>
            )}
            <Button onClick={stopTimer} variant="outline" disabled={!isRunning && timeLeft === 0}>
              <Square className="h-4 w-4 mr-2" />
              Detener
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
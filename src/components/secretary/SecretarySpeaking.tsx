import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SecretarySpeakingProps {
  committeeId: string;
}

interface SpeakingStatus {
  id: string;
  is_active: boolean;
  started_at?: string;
  ended_at?: string;
}

export default function SecretarySpeaking({ committeeId }: SecretarySpeakingProps) {
  const { profile } = useAuth();
  const [speakingStatus, setSpeakingStatus] = useState<SpeakingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (committeeId && profile?.id) {
      fetchSpeakingStatus();
      subscribeToChanges();
    }
  }, [committeeId, profile?.id]);

  const fetchSpeakingStatus = async () => {
    if (!profile?.id) return;

    // Buscar cualquier sesión activa del secretario en este comité
    const { data, error } = await supabase
      .from('secretary_speaking')
      .select('*')
      .eq('committee_id', committeeId)
      .eq('secretary_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching speaking status:', error);
    } else if (data) {
      setSpeakingStatus(data);
    } else {
      setSpeakingStatus(null);
    }
    setLoading(false);
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`secretary-speaking-${committeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'secretary_speaking',
          filter: `committee_id=eq.${committeeId}`
        },
        () => {
          fetchSpeakingStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startSpeaking = async () => {
    if (!profile?.id) return;

    const { error } = await supabase
      .from('secretary_speaking')
      .insert({
        committee_id: committeeId,
        secretary_id: profile.id,
        is_active: true,
        started_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error starting speaking:', error);
      toast({
        title: "Error",
        description: "No se pudo activar el turno del secretario",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Turno Activado",
        description: "Ahora estás hablando como secretario",
      });
    }
  };

  const endSpeaking = async () => {
    if (!speakingStatus?.id) return;

    const { error } = await supabase
      .from('secretary_speaking')
      .update({
        is_active: false,
        ended_at: new Date().toISOString()
      })
      .eq('id', speakingStatus.id);

    if (error) {
      console.error('Error ending speaking:', error);
      toast({
        title: "Error",
        description: "No se pudo desactivar el turno del secretario",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Turno Finalizado",
        description: "Has finalizado tu intervención como secretario",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Cargando...</div>;
  }

  const isActive = speakingStatus?.is_active || false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-muted'}`} />
          <div>
            <p className="font-medium">Estado del Micrófono</p>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? 'ACTIVO' : 'INACTIVO'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isActive ? (
            <Button 
              onClick={endSpeaking}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <MicOff className="h-4 w-4" />
              <span>Finalizar Turno</span>
            </Button>
          ) : (
            <Button 
              onClick={startSpeaking}
              className="flex items-center space-x-2"
            >
              <Mic className="h-4 w-4" />
              <span>Tomar la Palabra</span>
            </Button>
          )}
        </div>
      </div>

      {isActive && speakingStatus?.started_at && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center space-x-2 text-success">
            <Mic className="h-4 w-4" />
            <span className="font-medium">Hablando desde:</span>
            <span>{new Date(speakingStatus.started_at).toLocaleTimeString()}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tu intervención está siendo mostrada en la pantalla pública
          </p>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>
          Cuando actives tu turno, aparecerás como el orador principal en la pantalla pública del debate.
          Esto es útil para hacer anuncios, dar instrucciones o moderar la sesión.
        </p>
      </div>
    </div>
  );
}
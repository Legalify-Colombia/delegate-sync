import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MinusCircle, Vote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VotingPanelProps {
  committeeId: string;
  isSecretary?: boolean;
}

interface VoteCount {
  for: number;
  against: number;
  abstain: number;
}

export default function VotingPanel({ committeeId, isSecretary = false }: VotingPanelProps) {
  const { profile } = useAuth();
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [userVote, setUserVote] = useState<'for' | 'against' | 'abstain' | null>(null);
  const [voteCounts, setVoteCounts] = useState<VoteCount>({ for: 0, against: 0, abstain: 0 });
  const { toast } = useToast();

  useEffect(() => {
    checkVotingStatus();
    fetchVoteCounts();
    fetchUserVote();

    // Subscribe to real-time updates
    const votesChannel = supabase
      .channel('votes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `committee_id=eq.${committeeId}`,
        },
        () => {
          fetchVoteCounts();
        }
      )
      .subscribe();

    const committeeChannel = supabase
      .channel('committee-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'committees',
          filter: `id=eq.${committeeId}`,
        },
        (payload) => {
          setIsVotingActive(payload.new.current_status === 'voting');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(committeeChannel);
    };
  }, [committeeId]);

  const checkVotingStatus = async () => {
    const { data, error } = await supabase
      .from('committees')
      .select('current_status')
      .eq('id', committeeId)
      .single();

    if (!error) {
      setIsVotingActive(data.current_status === 'voting');
    }
  };

  const fetchVoteCounts = async () => {
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('committee_id', committeeId);

    if (!error && data) {
      const counts = data.reduce(
        (acc, vote) => {
          acc[vote.vote_type as keyof VoteCount]++;
          return acc;
        },
        { for: 0, against: 0, abstain: 0 }
      );
      setVoteCounts(counts);
    }
  };

  const fetchUserVote = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('committee_id', committeeId)
      .eq('user_id', profile.id)
      .single();

    if (!error && data) {
      setUserVote(data.vote_type as 'for' | 'against' | 'abstain');
    } else {
      setUserVote(null);
    }
  };

  const submitVote = async (voteType: 'for' | 'against' | 'abstain') => {
    if (!profile?.id || !isVotingActive) return;

    const { error } = await supabase
      .from('votes')
      .upsert({
        user_id: profile.id,
        committee_id: committeeId,
        vote_type: voteType,
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el voto",
        variant: "destructive",
      });
    } else {
      setUserVote(voteType);
      toast({
        title: "Voto Registrado",
        description: `Has votado: ${getVoteText(voteType)}`,
      });
    }
  };

  const startVoting = async () => {
    const { error } = await supabase
      .from('committees')
      .update({ current_status: 'voting' })
      .eq('id', committeeId);

    if (!error) {
      await supabase
        .from('debate_log')
        .insert({
          committee_id: committeeId,
          event_type: 'vote_started',
          details: {}
        });

      setIsVotingActive(true);
      toast({
        title: "Votación Iniciada",
        description: "La votación está ahora activa",
      });
    }
  };

  const endVoting = async () => {
    const { error } = await supabase
      .from('committees')
      .update({ current_status: 'paused' })
      .eq('id', committeeId);

    if (!error) {
      await supabase
        .from('debate_log')
        .insert({
          committee_id: committeeId,
          event_type: 'vote_closed',
          details: { results: voteCounts as any }
        });

      setIsVotingActive(false);
      toast({
        title: "Votación Cerrada",
        description: "La votación ha finalizado",
      });
    }
  };

  const getVoteText = (voteType: string) => {
    switch (voteType) {
      case 'for': return 'A Favor';
      case 'against': return 'En Contra';
      case 'abstain': return 'Abstención';
      default: return voteType;
    }
  };

  const totalVotes = voteCounts.for + voteCounts.against + voteCounts.abstain;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center space-x-2">
          <Vote className="h-4 w-4" />
          <span>Estado de Votación</span>
        </h3>
        <Badge variant={isVotingActive ? "default" : "secondary"}>
          {isVotingActive ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>

      {/* Vote Results */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">A Favor</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{voteCounts.for}</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium">En Contra</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{voteCounts.against}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <MinusCircle className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Abstención</span>
          </div>
          <div className="text-2xl font-bold text-gray-600">{voteCounts.abstain}</div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Total de votos: {totalVotes}
      </div>

      {/* Voting Controls */}
      {isSecretary ? (
        <div className="flex space-x-2">
          {!isVotingActive ? (
            <Button onClick={startVoting} className="flex-1">
              Iniciar Votación
            </Button>
          ) : (
            <Button onClick={endVoting} variant="outline" className="flex-1">
              Cerrar Votación
            </Button>
          )}
        </div>
      ) : (
        isVotingActive && profile?.role === 'delegate' && (
          <div className="space-y-2">
            {userVote && (
              <div className="text-center text-sm text-muted-foreground">
                Tu voto actual: <strong>{getVoteText(userVote)}</strong>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={userVote === 'for' ? 'default' : 'outline'}
                onClick={() => submitVote('for')}
                className="text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                A Favor
              </Button>
              <Button
                variant={userVote === 'against' ? 'default' : 'outline'}
                onClick={() => submitVote('against')}
                className="text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" />
                En Contra
              </Button>
              <Button
                variant={userVote === 'abstain' ? 'default' : 'outline'}
                onClick={() => submitVote('abstain')}
                className="text-xs"
              >
                <MinusCircle className="h-3 w-3 mr-1" />
                Abstención
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
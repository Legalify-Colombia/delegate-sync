import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Vote, 
  Settings, 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  Shield,
  RotateCcw,
  Play,
  Square
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface VotingSession {
  id: string;
  title: string;
  description?: string;
  voting_type: 'simple' | 'absolute_majority' | 'qualified_majority';
  allow_abstention: boolean;
  allow_veto: boolean;
  veto_members: string[];
  majority_threshold: number;
  max_rounds: number;
  current_round: number;
  status: 'pending' | 'active' | 'completed';
  agenda_item_id?: string;
}

interface VotingRound {
  id: string;
  round_number: number;
  status: 'pending' | 'active' | 'completed';
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  result?: string;
  vetoed_by?: string;
}

interface AdvancedVotingPanelProps {
  committeeId: string;
  isSecretary?: boolean;
  agendaItemId?: string;
}

export default function AdvancedVotingPanel({ 
  committeeId, 
  isSecretary = false, 
  agendaItemId 
}: AdvancedVotingPanelProps) {
  const { profile } = useAuth();
  const [currentSession, setCurrentSession] = useState<VotingSession | null>(null);
  const [currentRound, setCurrentRound] = useState<VotingRound | null>(null);
  const [delegates, setDelegates] = useState<any[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    voting_type: 'simple' as const,
    allow_abstention: true,
    allow_veto: false,
    veto_members: [] as string[],
    majority_threshold: 0.5,
    max_rounds: 1
  });

  useEffect(() => {
    if (committeeId) {
      fetchCurrentSession();
      fetchDelegates();
      subscribeToChanges();
    }
  }, [committeeId]);

  const fetchCurrentSession = async () => {
    const { data: sessionData } = await supabase
      .from('voting_sessions')
      .select('*')
      .eq('committee_id', committeeId)
      .eq('status', 'active')
      .maybeSingle();

    if (sessionData) {
      setCurrentSession(sessionData as VotingSession);
      
      // Fetch current round
      const { data: roundData } = await supabase
        .from('voting_rounds')
        .select('*')
        .eq('voting_session_id', sessionData.id)
        .eq('round_number', sessionData.current_round)
        .maybeSingle();

      setCurrentRound(roundData as VotingRound);

      // Fetch user vote for current round
      if (profile?.id && roundData) {
        const { data: voteData } = await supabase
          .from('votes')
          .select('vote_type')
          .eq('voting_round_id', roundData.id)
          .eq('user_id', profile.id)
          .maybeSingle();

        setUserVote(voteData?.vote_type || null);
      }
    } else {
      setCurrentSession(null);
      setCurrentRound(null);
      setUserVote(null);
    }
    setLoading(false);
  };

  const fetchDelegates = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, countries(name)')
      .eq('committee_id', committeeId)
      .eq('role', 'delegate');

    setDelegates(data || []);
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`voting-${committeeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_sessions', filter: `committee_id=eq.${committeeId}` }, fetchCurrentSession)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_rounds' }, fetchCurrentSession)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `committee_id=eq.${committeeId}` }, fetchCurrentSession)
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const createVotingSession = async () => {
    if (!newSession.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive",
      });
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from('voting_sessions')
      .insert({
        committee_id: committeeId,
        agenda_item_id: agendaItemId,
        title: newSession.title,
        description: newSession.description,
        voting_type: newSession.voting_type,
        allow_abstention: newSession.allow_abstention,
        allow_veto: newSession.allow_veto,
        veto_members: newSession.veto_members,
        majority_threshold: newSession.majority_threshold,
        max_rounds: newSession.max_rounds,
        current_round: 1,
        status: 'pending'
      })
      .select()
      .single();

    if (sessionError) {
      toast({
        title: "Error",
        description: "No se pudo crear la sesión de votación",
        variant: "destructive",
      });
      return;
    }

    // Create first round
    const { error: roundError } = await supabase
      .from('voting_rounds')
      .insert({
        voting_session_id: sessionData.id,
        round_number: 1,
        status: 'pending'
      });

    if (roundError) {
      toast({
        title: "Error",
        description: "No se pudo crear la primera ronda",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sesión Creada",
      description: "La sesión de votación está lista para comenzar",
    });

    setShowConfigDialog(false);
    setNewSession({
      title: '',
      description: '',
      voting_type: 'simple',
      allow_abstention: true,
      allow_veto: false,
      veto_members: [],
      majority_threshold: 0.5,
      max_rounds: 1
    });
  };

  const startVoting = async () => {
    if (!currentSession) return;

    const { error } = await supabase
      .from('voting_sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', currentSession.id);

    if (!error) {
      await supabase
        .from('voting_rounds')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('voting_session_id', currentSession.id)
        .eq('round_number', currentSession.current_round);

      toast({
        title: "Votación Iniciada",
        description: `Ronda ${currentSession.current_round} de ${currentSession.max_rounds}`,
      });
    }
  };

  const submitVote = async (voteType: 'for' | 'against' | 'abstain') => {
    if (!profile?.id || !currentRound) return;

    // Check if user has veto power and is trying to veto
    const hasVeto = currentSession?.allow_veto && 
                   currentSession.veto_members.includes(profile.id) && 
                   voteType === 'against';

    const { error } = await supabase
      .from('votes')
      .upsert({
        user_id: profile.id,
        committee_id: committeeId,
        voting_session_id: currentSession?.id,
        voting_round_id: currentRound.id,
        agenda_item_id: agendaItemId,
        vote_type: voteType
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
        title: hasVeto ? "Veto Ejercido" : "Voto Registrado",
        description: hasVeto ? "Has ejercido tu derecho de veto" : `Has votado: ${getVoteText(voteType)}`,
      });
    }
  };

  const closeRound = async () => {
    if (!currentSession || !currentRound) return;

    // Count votes
    const { data: votes } = await supabase
      .from('votes')
      .select('vote_type, user_id')
      .eq('voting_round_id', currentRound.id);

    const voteCounts = votes?.reduce((acc, vote) => {
      acc[vote.vote_type as keyof typeof acc]++;
      return acc;
    }, { for: 0, against: 0, abstain: 0 }) || { for: 0, against: 0, abstain: 0 };

    // Check for veto
    const vetoVote = votes?.find(vote => 
      vote.vote_type === 'against' && 
      currentSession.veto_members.includes(vote.user_id)
    );

    let result = 'failed';
    if (vetoVote && currentSession.allow_veto) {
      result = 'vetoed';
    } else {
      const totalVotes = voteCounts.for + voteCounts.against + (currentSession.allow_abstention ? 0 : voteCounts.abstain);
      const threshold = currentSession.majority_threshold;
      
      if (totalVotes > 0) {
        const approvalRate = voteCounts.for / totalVotes;
        result = approvalRate >= threshold ? 'passed' : 'failed';
      }
    }

    // Update round
    await supabase
      .from('voting_rounds')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        votes_for: voteCounts.for,
        votes_against: voteCounts.against,
        votes_abstain: voteCounts.abstain,
        result,
        vetoed_by: vetoVote?.user_id
      })
      .eq('id', currentRound.id);

    // If passed, vetoed, or max rounds reached, end session
    if (result === 'passed' || result === 'vetoed' || currentSession.current_round >= currentSession.max_rounds) {
      await supabase
        .from('voting_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);
    } else {
      // Create next round
      const nextRound = currentSession.current_round + 1;
      await supabase
        .from('voting_sessions')
        .update({ current_round: nextRound })
        .eq('id', currentSession.id);

      await supabase
        .from('voting_rounds')
        .insert({
          voting_session_id: currentSession.id,
          round_number: nextRound,
          status: 'pending'
        });
    }

    toast({
      title: "Ronda Cerrada",
      description: `Resultado: ${getResultText(result)}`,
    });
  };

  const getVoteText = (voteType: string) => {
    switch (voteType) {
      case 'for': return 'A Favor';
      case 'against': return 'En Contra';
      case 'abstain': return 'Abstención';
      default: return voteType;
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'passed': return 'Aprobado';
      case 'failed': return 'Rechazado';
      case 'vetoed': return 'Vetado';
      default: return result;
    }
  };

  const getVotingTypeText = (type: string) => {
    switch (type) {
      case 'simple': return 'Mayoría Simple';
      case 'absolute_majority': return 'Mayoría Absoluta (50% + 1)';
      case 'qualified_majority': return 'Mayoría Calificada (2/3)';
      default: return type;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Cargando votación...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Vote className="h-5 w-5" />
              <span>Sistema de Votación Avanzado</span>
            </CardTitle>
            <CardDescription>
              Gestiona votaciones con diferentes tipos de mayoría y múltiples rondas
            </CardDescription>
          </div>
          {isSecretary && !currentSession && (
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Nueva Votación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Configurar Nueva Votación</DialogTitle>
                  <DialogDescription>
                    Define los parámetros para la sesión de votación
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Título de la Votación</Label>
                      <Input
                        value={newSession.title}
                        onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                        placeholder="Ej: Votación sobre Resolución A/RES/..."
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Descripción (Opcional)</Label>
                      <Textarea
                        value={newSession.description}
                        onChange={(e) => setNewSession({...newSession, description: e.target.value})}
                        placeholder="Detalles adicionales sobre la votación"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Tipo de Votación</Label>
                      <Select 
                        value={newSession.voting_type} 
                        onValueChange={(value: any) => {
                          const threshold = value === 'qualified_majority' ? 0.67 : 
                                         value === 'absolute_majority' ? 0.51 : 0.5;
                          setNewSession({...newSession, voting_type: value, majority_threshold: threshold});
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Mayoría Simple (50%)</SelectItem>
                          <SelectItem value="absolute_majority">Mayoría Absoluta (50% + 1)</SelectItem>
                          <SelectItem value="qualified_majority">Mayoría Calificada (2/3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Máximo de Rondas</Label>
                      <Select 
                        value={newSession.max_rounds.toString()} 
                        onValueChange={(value) => setNewSession({...newSession, max_rounds: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Ronda</SelectItem>
                          <SelectItem value="2">2 Rondas</SelectItem>
                          <SelectItem value="3">3 Rondas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newSession.allow_abstention}
                        onCheckedChange={(checked) => setNewSession({...newSession, allow_abstention: checked})}
                      />
                      <Label>Permitir Abstención</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newSession.allow_veto}
                        onCheckedChange={(checked) => setNewSession({...newSession, allow_veto: checked})}
                      />
                      <Label>Permitir Derecho a Veto</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createVotingSession}>
                    Crear Votación
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentSession ? (
          <div className="text-center py-8 text-muted-foreground">
            <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay votaciones activas</p>
            {isSecretary && (
              <p className="text-sm">Configura una nueva votación para comenzar</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Session Info */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold">{currentSession.title}</h4>
                  {currentSession.description && (
                    <p className="text-sm text-muted-foreground">{currentSession.description}</p>
                  )}
                </div>
                <Badge variant={currentSession.status === 'active' ? 'default' : 'secondary'}>
                  {currentSession.status === 'active' ? 'ACTIVA' : 'PENDIENTE'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Tipo: {getVotingTypeText(currentSession.voting_type)}</span>
                <span>Ronda: {currentSession.current_round}/{currentSession.max_rounds}</span>
                {currentSession.allow_veto && (
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Veto Habilitado
                  </span>
                )}
              </div>
            </div>

            {/* Round Results */}
            {currentRound && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-success/10 rounded-lg">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">A Favor</span>
                  </div>
                  <div className="text-2xl font-bold text-success">{currentRound.votes_for}</div>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">En Contra</span>
                  </div>
                  <div className="text-2xl font-bold text-destructive">{currentRound.votes_against}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <MinusCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Abstención</span>
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">{currentRound.votes_abstain}</div>
                </div>
              </div>
            )}

            {/* Controls */}
            {isSecretary ? (
              <div className="flex gap-2">
                {currentSession.status === 'pending' && (
                  <Button onClick={startVoting} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Ronda {currentSession.current_round}
                  </Button>
                )}
                {currentSession.status === 'active' && (
                  <Button onClick={closeRound} variant="outline" className="flex-1">
                    <Square className="h-4 w-4 mr-2" />
                    Cerrar Ronda
                  </Button>
                )}
              </div>
            ) : (
              currentSession.status === 'active' && profile?.role === 'delegate' && (
                <div className="space-y-2">
                  {userVote && (
                    <div className="text-center text-sm text-muted-foreground">
                      Tu voto: <strong>{getVoteText(userVote)}</strong>
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
                      {currentSession.allow_veto && currentSession.veto_members.includes(profile?.id || '') ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {currentSession.allow_veto && currentSession.veto_members.includes(profile?.id || '') 
                        ? 'Vetar' 
                        : 'En Contra'
                      }
                    </Button>
                    {currentSession.allow_abstention && (
                      <Button
                        variant={userVote === 'abstain' ? 'default' : 'outline'}
                        onClick={() => submitVote('abstain')}
                        className="text-xs"
                      >
                        <MinusCircle className="h-3 w-3 mr-1" />
                        Abstención
                      </Button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Suspension {
  palabra_suspendida: boolean;
  voto_suspendido: boolean;
}

export function useDelegateSuspensions(delegateId: string | undefined, committeeId: string) {
  const [suspensions, setSuspensions] = useState<Suspension | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!delegateId || !committeeId) {
      setLoading(false);
      return;
    }

    fetchSuspensions();

    // Real-time subscription for suspensions
    const channel = supabase
      .channel(`delegate-suspensions-${delegateId}-${committeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delegate_suspensions',
          filter: `delegate_id=eq.${delegateId}`,
        },
        () => {
          fetchSuspensions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'amonestaciones',
          filter: `delegate_id=eq.${delegateId}`,
        },
        () => {
          fetchSuspensions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [delegateId, committeeId]);

  const fetchSuspensions = async () => {
    if (!delegateId) return;
    
    try {
      const { data, error } = await supabase
        .from('delegate_suspensions')
        .select('palabra_suspendida, voto_suspendido')
        .eq('delegate_id', delegateId)
        .eq('committee_id', committeeId)
        .maybeSingle();

      if (!error) {
        setSuspensions(data || null);
      }
    } catch (err) {
      console.error('Error fetching suspensions:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    suspensions,
    loading,
    isSpeechSuspended: suspensions?.palabra_suspendida || false,
    isVoteSuspended: suspensions?.voto_suspendido || false,
  };
}
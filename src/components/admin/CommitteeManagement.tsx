import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Play, Pause, Vote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Committee {
  id: string;
  name: string;
  topic: string;
  current_status: 'active' | 'paused' | 'voting';
  current_timer_end: string | null;
  created_at: string;
}

export default function CommitteeManagement() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommittees();
  }, []);

  const fetchCommittees = async () => {
    const { data, error } = await supabase
      .from('committees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los comités",
        variant: "destructive",
      });
    } else {
      setCommittees(data || []);
    }
    setLoading(false);
  };

  const updateCommitteeStatus = async (id: string, status: 'active' | 'paused' | 'voting') => {
    const { error } = await supabase
      .from('committees')
      .update({ current_status: status })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Error al actualizar el estado del comité",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Estado del comité actualizado",
      });
      fetchCommittees();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'voting': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Debate Activo';
      case 'voting': return 'Votación';
      case 'paused': return 'En Pausa';
      default: return 'Desconocido';
    }
  };

  if (loading) {
    return <div>Cargando comités...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Comités</CardTitle>
            <CardDescription>Administra los comités y controla sus estados</CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Comité
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {committees.map((committee) => (
            <div key={committee.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold">{committee.name}</h3>
                  <Badge 
                    variant="secondary" 
                    className={`${getStatusColor(committee.current_status)} text-white`}
                  >
                    {getStatusText(committee.current_status)}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateCommitteeStatus(committee.id, 'active')}
                    disabled={committee.current_status === 'active'}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateCommitteeStatus(committee.id, 'paused')}
                    disabled={committee.current_status === 'paused'}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateCommitteeStatus(committee.id, 'voting')}
                    disabled={committee.current_status === 'voting'}
                  >
                    <Vote className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{committee.topic}</p>
              <p className="text-xs text-muted-foreground">
                Creado: {new Date(committee.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
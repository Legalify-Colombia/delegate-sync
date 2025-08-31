import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

interface CommitteeFormData {
  name: string;
  topic: string;
}

export default function CommitteeManagement() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<Committee | null>(null);
  const [formData, setFormData] = useState<CommitteeFormData>({ name: '', topic: '' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.topic.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCommittee) {
        const { error } = await supabase
          .from('committees')
          .update({
            name: formData.name.trim(),
            topic: formData.topic.trim(),
          })
          .eq('id', editingCommittee.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Comité actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('committees')
          .insert({
            name: formData.name.trim(),
            topic: formData.topic.trim(),
          });

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Comité creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingCommittee(null);
      setFormData({ name: '', topic: '' });
      fetchCommittees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar el comité",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (committee: Committee) => {
    setEditingCommittee(committee);
    setFormData({ name: committee.name, topic: committee.topic });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comité?')) return;

    const { error } = await supabase
      .from('committees')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Error al eliminar el comité",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Comité eliminado correctamente",
      });
      fetchCommittees();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', topic: '' });
    setEditingCommittee(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'voting': return 'bg-primary';
      case 'paused': return 'bg-warning';
      default: return 'bg-muted';
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Comité
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCommittee ? 'Editar Comité' : 'Agregar Nuevo Comité'}
                </DialogTitle>
                <DialogDescription>
                  {editingCommittee ? 'Modifica los datos del comité' : 'Ingresa los datos del nuevo comité'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Comité</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej: Consejo de Seguridad"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Tema a Debatir</Label>
                  <Textarea
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="ej: La crisis climática como amenaza a la paz y seguridad internacional"
                    required
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingCommittee ? 'Actualizar' : 'Crear'} Comité
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(committee)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(committee.id)}
                  >
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
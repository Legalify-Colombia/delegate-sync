import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ExtendedCommittee } from '@/integrations/supabase/custom-types';

interface CommitteeFormData {
  name: string;
  topic: string;
}

export default function CommitteeManagementByModel() {
  const [committees, setCommittees] = useState<ExtendedCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<ExtendedCommittee | null>(null);
  const [formData, setFormData] = useState<CommitteeFormData>({
    name: '',
    topic: ''
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.model_id) {
      fetchCommittees();
    }
  }, [profile]);

  const fetchCommittees = async () => {
    if (!profile?.model_id) return;
    
    const { data, error } = await supabase
      .from('committees')
      .select('*')
      .eq('model_id', profile.model_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los comités",
        variant: "destructive",
      });
    } else {
      setCommittees((data as any) || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.topic.trim()) {
      toast({
        title: "Error",
        description: "Nombre y tema son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const committeeData = {
        name: formData.name.trim(),
        topic: formData.topic.trim(),
        model_id: profile?.model_id,
        current_status: 'paused' as const,
        session_accumulated_seconds: 0
      };

      if (editingCommittee) {
        const { error } = await supabase
          .from('committees')
          .update(committeeData)
          .eq('id', editingCommittee.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Comité actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('committees')
          .insert([committeeData]);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Comité creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingCommittee(null);
      resetForm();
      fetchCommittees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar el comité",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (committee: ExtendedCommittee) => {
    setEditingCommittee(committee);
    setFormData({
      name: committee.name,
      topic: committee.topic
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comité?')) return;

    try {
      const { error } = await supabase
        .from('committees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Comité eliminado correctamente",
      });
      fetchCommittees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al eliminar el comité",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      topic: ''
    });
    setEditingCommittee(null);
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'Activo',
      paused: 'En Pausa', 
      voting: 'En Votación',
      closed: 'Cerrado'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      active: 'bg-green-500',
      paused: 'bg-yellow-500',
      voting: 'bg-blue-500', 
      closed: 'bg-gray-500'
    };
    return colorMap[status] || 'bg-gray-500';
  };

  if (loading) {
    return <div>Cargando comités...</div>;
  }

  // Only allow Secretary General to create committees for their model
  const canCreateCommittees = profile?.role === 'secretary_general' && profile?.model_id;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Comités del Modelo</CardTitle>
            <CardDescription>Administra los comités de tu modelo MUN</CardDescription>
          </div>
          {canCreateCommittees && (
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
              <DialogContent className="max-w-md">
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
                      placeholder="ej. Consejo de Seguridad"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="topic">Tema</Label>
                    <Textarea
                      id="topic"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="Describe el tema principal del comité..."
                      rows={3}
                      required
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {committees.map((committee) => (
            <Card key={committee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{committee.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <span 
                        className={`inline-block w-2 h-2 rounded-full ${getStatusColor(committee.current_status || 'paused')}`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {getStatusDisplay(committee.current_status || 'paused')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {committee.topic}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(committee.created_at || '').toLocaleDateString()}</span>
                  </div>
                </div>

                {canCreateCommittees && (
                  <div className="flex justify-end gap-2 pt-2">
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
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
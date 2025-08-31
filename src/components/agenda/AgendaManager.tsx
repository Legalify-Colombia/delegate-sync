import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Play, 
  Pause, 
  CheckCircle, 
  Plus, 
  Edit, 
  Trash2,
  FileText,
  Timer,
  Users 
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

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  position: number;
  status: 'pending' | 'active' | 'completed';
  time_allocated: number;
  started_at?: string;
  completed_at?: string;
  is_active: boolean;
}

interface AgendaManagerProps {
  committeeId: string;
}

export default function AgendaManager({ committeeId }: AgendaManagerProps) {
  const { profile } = useAuth();
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    time_allocated: 1800 // 30 minutes default
  });
  const { toast } = useToast();

  useEffect(() => {
    if (committeeId) {
      fetchAgendaItems();
      subscribeToChanges();
    }
  }, [committeeId]);

  const fetchAgendaItems = async () => {
    const { data, error } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('committee_id', committeeId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching agenda items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los elementos de la agenda",
        variant: "destructive",
      });
    } else {
      setAgendaItems((data || []) as AgendaItem[]);
    }
    setLoading(false);
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`agenda-${committeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agenda_items',
          filter: `committee_id=eq.${committeeId}`
        },
        () => {
          fetchAgendaItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createAgendaItem = async () => {
    if (!newItem.title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive",
      });
      return;
    }

    const nextPosition = Math.max(...agendaItems.map(item => item.position), 0) + 1;

    const { error } = await supabase
      .from('agenda_items')
      .insert({
        committee_id: committeeId,
        title: newItem.title.trim(),
        description: newItem.description.trim() || null,
        time_allocated: newItem.time_allocated,
        position: nextPosition,
        status: 'pending'
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el elemento de la agenda",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Elemento Creado",
        description: "Se ha agregado un nuevo elemento a la agenda",
      });
      setNewItem({ title: '', description: '', time_allocated: 1800 });
      setShowCreateDialog(false);
    }
  };

  const updateAgendaItem = async (id: string, updates: Partial<AgendaItem>) => {
    const { error } = await supabase
      .from('agenda_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el elemento",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Elemento Actualizado",
        description: "Los cambios se han guardado correctamente",
      });
      setEditingItem(null);
    }
  };

  const deleteAgendaItem = async (id: string) => {
    const { error } = await supabase
      .from('agenda_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el elemento",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Elemento Eliminado",
        description: "El elemento se ha eliminado de la agenda",
      });
    }
  };

  const activateAgendaItem = async (id: string) => {
    // First, deactivate any active item
    const activeItem = agendaItems.find(item => item.is_active);
    if (activeItem) {
      await supabase
        .from('agenda_items')
        .update({ 
          is_active: false,
          status: activeItem.status === 'active' ? 'pending' : activeItem.status
        })
        .eq('id', activeItem.id);
    }

    // Activate the selected item
    await updateAgendaItem(id, {
      is_active: true,
      status: 'active',
      started_at: new Date().toISOString()
    });
  };

  const completeAgendaItem = async (id: string) => {
    await updateAgendaItem(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      is_active: false
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'En Progreso';
      case 'completed': return 'Completado';
      default: return 'Pendiente';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Cargando agenda...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Agenda del Debate</span>
            </CardTitle>
            <CardDescription>
              Gestiona los temas y puntos de discusión
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Elemento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Elemento</DialogTitle>
                <DialogDescription>
                  Agrega un nuevo punto a la agenda del debate
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título</label>
                  <Input
                    value={newItem.title}
                    onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                    placeholder="Ej: Discusión sobre resolución A/RES/..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descripción (Opcional)</label>
                  <Textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    placeholder="Detalles adicionales sobre este punto de la agenda"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tiempo Estimado (minutos)</label>
                  <Input
                    type="number"
                    value={newItem.time_allocated / 60}
                    onChange={(e) => setNewItem({...newItem, time_allocated: parseInt(e.target.value) * 60 || 1800})}
                    min="5"
                    max="180"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createAgendaItem}>
                  Crear Elemento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {agendaItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay elementos en la agenda</p>
            <p className="text-sm">Crea el primer elemento para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agendaItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 border rounded-lg ${item.is_active ? 'border-success bg-success/5' : 'bg-card'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {index + 1}
                      </Badge>
                      <h4 className="font-semibold">{item.title}</h4>
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Badge>
                      {item.is_active && (
                        <Badge variant="default" className="animate-pulse">
                          <Users className="h-3 w-3 mr-1" />
                          ACTIVO
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Timer className="h-3 w-3 mr-1" />
                      <span>Tiempo estimado: {formatTime(item.time_allocated)}</span>
                      {item.started_at && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Iniciado: {new Date(item.started_at).toLocaleTimeString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {item.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => activateAgendaItem(item.id)}
                        disabled={agendaItems.some(i => i.is_active && i.id !== item.id)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Activar
                      </Button>
                    )}
                    {item.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeAgendaItem(item.id)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completar
                      </Button>
                    )}
                    {item.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteAgendaItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
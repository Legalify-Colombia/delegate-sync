import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Plus, 
  Users, 
  Archive,
  Send,
  Play,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface StaffRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  committee_id: string;
  requester_id: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  committees: { name: string };
  requester: { full_name: string };
  assigned_staff?: { full_name: string };
}

interface StaffRequestManagerProps {
  isStaff?: boolean;
}

export default function StaffRequestManager({ isStaff = false }: StaffRequestManagerProps) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isStaff ? 'incoming' : 'create');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('staff_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    if (!profile) return;

    let query = supabase
      .from('staff_requests')
      .select(`
        *,
        committees (name),
        requester:profiles!staff_requests_requester_id_fkey (full_name),
        assigned_staff:profiles!staff_requests_assigned_to_fkey (full_name)
      `);

    // Staff puede ver todas las solicitudes, secretarios solo las suyas
    if (isStaff && profile.role === 'staff') {
      // Staff ve todas las solicitudes sin filtro
    } else if (!isStaff) {
      // Secretarios solo ven sus propias solicitudes
      query = query.eq('requester_id', profile.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes",
        variant: "destructive",
      });
    } else {
      setRequests((data as any) || []);
    }
    setLoading(false);
  };

  const createRequest = async () => {
    if (!profile || !title.trim() || !description.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Complete título y descripción",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('staff_requests')
      .insert({
        title: title.trim(),
        description: description.trim(),
        priority,
        committee_id: profile.committee_id!,
        requester_id: profile.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Solicitud creada",
        description: "Tu solicitud ha sido enviada al equipo de staff",
      });
      resetForm();
      setIsDialogOpen(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: 'in_progress' | 'completed' | 'archived') => {
    if (!profile) return;

    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (status === 'in_progress' && profile) {
      updateData.assigned_to = profile.id;
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('staff_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la solicitud",
        variant: "destructive",
      });
    } else {
      const messages = {
        in_progress: `Solicitud tomada por ${profile.full_name}`,
        completed: 'Solicitud marcada como completada',
        archived: 'Solicitud archivada',
      };
      
      toast({
        title: "Actualizado",
        description: messages[status],
      });
      
      // Refrescar la lista inmediatamente
      fetchRequests();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { label: 'Baja', variant: 'secondary' as const },
      medium: { label: 'Media', variant: 'default' as const },
      high: { label: 'Alta', variant: 'default' as const },
      urgent: { label: 'Urgente', variant: 'destructive' as const },
    };
    
    const { label, variant } = config[priority as keyof typeof config];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'Pendiente', variant: 'outline' as const },
      in_progress: { label: 'En Progreso', variant: 'default' as const },
      completed: { label: 'Completado', variant: 'default' as const },
      archived: { label: 'Archivado', variant: 'secondary' as const },
    };
    
    const { label, variant } = config[status as keyof typeof config];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredRequests = (status?: string) => {
    if (!status) return requests;
    return requests.filter(req => req.status === status);
  };

  if (loading) {
    return <div className="flex justify-center p-4">Cargando solicitudes...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>{isStaff ? 'Gestión de Solicitudes' : 'Solicitudes de Staff'}</span>
            </CardTitle>
            <CardDescription>
              {isStaff 
                ? 'Gestiona las solicitudes de apoyo de los secretarios'
                : 'Solicita apoyo del equipo de staff'
              }
            </CardDescription>
          </div>
          {!isStaff && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Solicitud
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Solicitud de Staff</DialogTitle>
                  <DialogDescription>
                    Describe la ayuda que necesitas del equipo de apoyo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título de la Solicitud</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: Necesito asistencia técnica"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe detalladamente qué necesitas..."
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={createRequest}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Solicitud
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            {isStaff ? (
              <>
                <TabsTrigger value="incoming">Pendientes ({filteredRequests('pending').length})</TabsTrigger>
                <TabsTrigger value="progress">En Progreso ({filteredRequests('in_progress').length})</TabsTrigger>
                <TabsTrigger value="completed">Completadas ({filteredRequests('completed').length})</TabsTrigger>
                <TabsTrigger value="all">Todas</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="create">Crear</TabsTrigger>
                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                <TabsTrigger value="progress">En Progreso</TabsTrigger>
                <TabsTrigger value="completed">Completadas</TabsTrigger>
              </>
            )}
          </TabsList>

          {!isStaff && (
            <TabsContent value="create">
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Solicita Apoyo del Staff</h3>
                <p className="text-muted-foreground mb-4">
                  ¿Necesitas ayuda técnica, logística o de coordinación?
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nueva Solicitud
                </Button>
              </div>
            </TabsContent>
          )}

          {['incoming', 'pending', 'progress', 'completed', 'all'].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue}>
              <div className="space-y-4">
                {filteredRequests(tabValue === 'all' ? undefined : 
                  tabValue === 'incoming' ? 'pending' : tabValue).map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(request.status)}
                          <h4 className="font-semibold">{request.title}</h4>
                          {getStatusBadge(request.status)}
                          {getPriorityBadge(request.priority)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Comité:</strong> {request.committees.name}
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Solicitado por:</strong> {request.requester.full_name}
                        </p>
                        {request.assigned_staff && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Asignado a:</strong> {request.assigned_staff.full_name}
                          </p>
                        )}
                        <p className="text-sm">{request.description}</p>
                      </div>
                      {isStaff && (
                        <div className="flex flex-col space-y-2 ml-4">
                          {request.status === 'pending' && (
                            <Button
                              onClick={() => updateRequestStatus(request.id, 'in_progress')}
                              size="sm"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Tomar
                            </Button>
                          )}
                          {request.status === 'in_progress' && (
                            <Button
                              onClick={() => updateRequestStatus(request.id, 'completed')}
                              size="sm"
                              variant="outline"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completar
                            </Button>
                          )}
                          {request.status === 'completed' && (
                            <Button
                              onClick={() => updateRequestStatus(request.id, 'archived')}
                              size="sm"
                              variant="ghost"
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archivar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Creado: {new Date(request.created_at).toLocaleString()}
                      {request.completed_at && (
                        <span> • Completado: {new Date(request.completed_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredRequests(tabValue === 'all' ? undefined : 
                  tabValue === 'incoming' ? 'pending' : tabValue).length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No hay solicitudes en esta categoría
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, FileWarning, Star, Eye, EyeOff, CheckCircle, UserX, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DelegateRatingModal from './DelegateRatingModal';

interface Delegate {
  id: string;
  full_name: string;
  countries?: { name: string };
  country_id?: string;
}

interface Warning {
  id: string;
  titulo: string;
  descripcion: string;
  justificacion?: string;
  suspender_palabra: boolean;
  suspender_voto: boolean;
  activa: boolean;
  created_at: string;
}

interface Suspension {
  id: string;
  palabra_suspendida: boolean;
  voto_suspendido: boolean;
}

interface AttendanceRecord {
  id: string;
  committee_id: string;
  profile_id: string;
  presente: boolean;
  fecha: string;
}

interface WarningFormData {
  titulo: string;
  descripcion: string;
  justificacion: string;
  suspender_palabra: boolean;
  suspender_voto: boolean;
}

interface DelegateWarningsProps {
  committeeId: string;
}

export default function DelegateWarnings({ committeeId }: DelegateWarningsProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [suspensions, setSuspensions] = useState<Record<string, Suspension>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [warningForm, setWarningForm] = useState<WarningFormData>({
    titulo: '',
    descripcion: '',
    justificacion: '',
    suspender_palabra: false,
    suspender_voto: false,
  });
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showWarningsDialog, setShowWarningsDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDelegates();
    fetchSuspensions();
    fetchAttendanceData();
  }, [committeeId]);

  const fetchDelegates = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        country_id,
        countries (name)
      `)
      .eq('committee_id', committeeId)
      .eq('role', 'delegate')
      .order('full_name', { ascending: true });

    if (!error) {
      setDelegates(data || []);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const { data: attendanceData, error } = await supabase
        .from('asistencia')
        .select('*')
        .eq('committee_id', committeeId)
        .order('fecha', { ascending: false });

      if (!error) {
        const latestByDelegate = new Map<string, AttendanceRecord>();
        (attendanceData as any[] | null)?.forEach((rec: any) => {
          if (!latestByDelegate.has(rec.profile_id)) {
            latestByDelegate.set(rec.profile_id, rec);
          }
        });

        const map: Record<string, boolean> = {};
        delegates.forEach((d: any) => {
          const latest = latestByDelegate.get(d.id);
          map[d.id] = latest?.presente ?? false;
        });
        setAttendanceMap(map);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const setAttendanceStatus = async (delegateId: string, presente: boolean) => {
    try {
      const { error } = await supabase
        .from('asistencia')
        .insert({
          committee_id: committeeId,
          profile_id: delegateId,
          presente,
        });

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar la asistencia',
          variant: 'destructive',
        });
        return;
      }

      setAttendanceMap((prev) => ({ ...prev, [delegateId]: presente }));
      toast({
        title: 'Asistencia actualizada',
        description: presente ? 'Marcado como presente' : 'Marcado como ausente',
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Ocurrió un problema al actualizar',
        variant: 'destructive',
      });
    }
  };

  const fetchSuspensions = async () => {
    const { data, error } = await supabase
      .from('delegate_suspensions')
      .select('*')
      .eq('committee_id', committeeId);

    if (!error) {
      const suspensionsMap = data?.reduce((acc, susp) => {
        acc[susp.delegate_id] = susp;
        return acc;
      }, {} as Record<string, Suspension>) || {};
      setSuspensions(suspensionsMap);
    }
  };

  // Use effect to update attendance when delegates change
  useEffect(() => {
    if (delegates.length > 0) {
      fetchAttendanceData();
    }
  }, [delegates]);

  const presentCount = useMemo(() => 
    Object.values(attendanceMap).filter(s => s === true).length, 
    [attendanceMap]
  );

  const fetchWarnings = async (delegateId: string) => {
    const { data, error } = await supabase
      .from('amonestaciones')
      .select('*')
      .eq('delegate_id', delegateId)
      .order('created_at', { ascending: false });

    if (!error) {
      setWarnings(data || []);
    }
  };

  const handleCreateWarning = async () => {
    if (!selectedDelegate || !profile) return;

    setLoading(true);

    // Crear amonestación
    const { error: warningError } = await supabase
      .from('amonestaciones')
      .insert({
        titulo: warningForm.titulo,
        descripcion: warningForm.descripcion,
        justificacion: warningForm.justificacion,
        suspender_palabra: warningForm.suspender_palabra,
        suspender_voto: warningForm.suspender_voto,
        delegate_id: selectedDelegate.id,
        secretary_id: profile.id,
        country_id: selectedDelegate.countries?.name || '',
      });

    if (warningError) {
      toast({
        title: "Error",
        description: "No se pudo crear la amonestación",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Actualizar o crear suspensiones si es necesario
    if (warningForm.suspender_palabra || warningForm.suspender_voto) {
      const existingSuspension = suspensions[selectedDelegate.id];
      
      const suspensionData = {
        delegate_id: selectedDelegate.id,
        committee_id: committeeId,
        palabra_suspendida: warningForm.suspender_palabra || (existingSuspension?.palabra_suspendida || false),
        voto_suspendido: warningForm.suspender_voto || (existingSuspension?.voto_suspendido || false),
      };

      if (existingSuspension) {
        await supabase
          .from('delegate_suspensions')
          .update(suspensionData)
          .eq('id', existingSuspension.id);
      } else {
        await supabase
          .from('delegate_suspensions')
          .insert(suspensionData);
      }
    }

    toast({
      title: "Amonestación creada",
      description: "La amonestación ha sido registrada correctamente",
    });

    // Reset form
    setWarningForm({
      titulo: '',
      descripcion: '',
      justificacion: '',
      suspender_palabra: false,
      suspender_voto: false,
    });

    setShowWarningDialog(false);
    setLoading(false);
    fetchSuspensions();
  };

  const handleToggleSuspensions = async (delegateId: string, suspensions: Suspension) => {
    const { error } = await supabase
      .from('delegate_suspensions')
      .update({
        palabra_suspendida: false,
        voto_suspendido: false,
      })
      .eq('id', suspensions.id);

    if (!error) {
      toast({
        title: "Suspensiones desactivadas",
        description: "El delegado ha sido habilitado nuevamente",
      });
      fetchSuspensions();
    }
  };

  const handleToggleWarning = async (warningId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('amonestaciones')
      .update({ activa: !currentStatus })
      .eq('id', warningId);

    if (!error) {
      toast({
        title: currentStatus ? "Amonestación desactivada" : "Amonestación activada",
        description: "El estado de la amonestación ha sido actualizado",
      });
      if (selectedDelegate) {
        fetchWarnings(selectedDelegate.id);
      }
    }
  };

  const getDelegateSuspensionStatus = (delegateId: string) => {
    const suspension = suspensions[delegateId];
    if (!suspension) return null;
    
    const statuses = [];
    if (suspension.palabra_suspendida) statuses.push("Sin palabra");
    if (suspension.voto_suspendido) statuses.push("Sin voto");
    
    return statuses.length > 0 ? statuses.join(", ") : null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Gestión de Delegados</span>
        </CardTitle>
        <CardDescription>
          Gestiona la asistencia, calificaciones y amonestaciones de los delegados. 
          Presentes: {presentCount}/{delegates.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {delegates.map((delegate) => (
            <div key={delegate.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{delegate.full_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {delegate.countries?.name}
                </p>
                {getDelegateSuspensionStatus(delegate.id) && (
                  <Badge variant="destructive" className="mt-1">
                    {getDelegateSuspensionStatus(delegate.id)}
                  </Badge>
                )}
              </div>
              
              <div className="flex space-x-2">
                {/* Estado de asistencia */}
                <div className="flex items-center gap-2">
                  {attendanceMap[delegate.id] ? (
                    <Badge variant="secondary" className="bg-success text-success-foreground">Presente</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Ausente</Badge>
                  )}
                  <Button
                    variant={attendanceMap[delegate.id] ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAttendanceStatus(delegate.id, true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Presente
                  </Button>
                  <Button
                    variant={!attendanceMap[delegate.id] ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setAttendanceStatus(delegate.id, false)}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Ausente
                  </Button>
                </div>
                
                {/* Botón Calificar */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDelegate(delegate);
                    setShowRatingDialog(true);
                  }}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Calificar
                </Button>

                {/* Botón Amonestar */}
                <Dialog open={showWarningDialog && selectedDelegate?.id === delegate.id} onOpenChange={setShowWarningDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDelegate(delegate)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Amonestar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Amonestación</DialogTitle>
                      <DialogDescription>
                        Amonestación para {delegate.full_name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="titulo">Título de la Amonestación</Label>
                        <Input
                          id="titulo"
                          value={warningForm.titulo}
                          onChange={(e) => setWarningForm(prev => ({ ...prev, titulo: e.target.value }))}
                          placeholder="Ej: Interrupción durante intervención"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                          id="descripcion"
                          value={warningForm.descripcion}
                          onChange={(e) => setWarningForm(prev => ({ ...prev, descripcion: e.target.value }))}
                          placeholder="Describe brevemente la falta"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="justificacion">Justificación</Label>
                        <Textarea
                          id="justificacion"
                          value={warningForm.justificacion}
                          onChange={(e) => setWarningForm(prev => ({ ...prev, justificacion: e.target.value }))}
                          placeholder="Justificación detallada de la sanción"
                          rows={3}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label>Sanciones Temporales</Label>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="suspender_palabra"
                            checked={warningForm.suspender_palabra}
                            onCheckedChange={(checked) => 
                              setWarningForm(prev => ({ ...prev, suspender_palabra: checked }))
                            }
                          />
                          <Label htmlFor="suspender_palabra">Suspender derecho a la palabra</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="suspender_voto"
                            checked={warningForm.suspender_voto}
                            onCheckedChange={(checked) => 
                              setWarningForm(prev => ({ ...prev, suspender_voto: checked }))
                            }
                          />
                          <Label htmlFor="suspender_voto">Suspender derecho al voto</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateWarning}
                        disabled={loading || !warningForm.titulo || !warningForm.descripcion}
                      >
                        {loading ? 'Creando...' : 'Crear Amonestación'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Botón Ver Amonestaciones */}
                <Dialog open={showWarningsDialog && selectedDelegate?.id === delegate.id} onOpenChange={setShowWarningsDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDelegate(delegate);
                        fetchWarnings(delegate.id);
                      }}
                    >
                      <FileWarning className="h-4 w-4 mr-1" />
                      Amonestaciones
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Historial de Amonestaciones</DialogTitle>
                      <DialogDescription>
                        Amonestaciones de {delegate.full_name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {warnings.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No hay amonestaciones registradas
                        </p>
                      ) : (
                        warnings.map((warning) => (
                          <div key={warning.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{warning.titulo}</h5>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleWarning(warning.id, warning.activa)}
                                >
                                  {warning.activa ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Badge variant={warning.activa ? "destructive" : "secondary"}>
                                  {warning.activa ? "Activa" : "Inactiva"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(warning.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {warning.descripcion}
                            </p>
                            {warning.justificacion && (
                              <p className="text-sm mb-2">
                                <strong>Justificación:</strong> {warning.justificacion}
                              </p>
                            )}
                            <div className="flex space-x-2">
                              {warning.suspender_palabra && (
                                <Badge variant="outline">Sin palabra</Badge>
                              )}
                              {warning.suspender_voto && (
                                <Badge variant="outline">Sin voto</Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <DialogFooter>
                      {suspensions[delegate.id] && (
                        <Button
                          variant="outline"
                          onClick={() => handleToggleSuspensions(delegate.id, suspensions[delegate.id])}
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          Habilitar Delegado
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Modal de Calificación */}
      <DelegateRatingModal
        delegate={selectedDelegate}
        isOpen={showRatingDialog}
        onClose={() => {
          setShowRatingDialog(false);
          setSelectedDelegate(null);
        }}
      />
    </Card>
  );
}
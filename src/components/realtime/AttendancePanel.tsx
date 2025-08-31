import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, UserX, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Delegate {
  id: string;
  full_name: string;
  country_id: string | null;
}

interface AttendanceRecord {
  id: string;
  committee_id: string;
  profile_id: string;
  presente: boolean;
  fecha: string;
}

interface AttendancePanelProps {
  committeeId: string;
}

export default function AttendancePanel({ committeeId }: AttendancePanelProps) {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!committeeId) return;
    fetchDelegatesAndAttendance();
    // Realtime for attendance changes
    const channel = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asistencia', filter: `committee_id=eq.${committeeId}` },
        () => fetchDelegatesAndAttendance()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [committeeId]);

  const fetchDelegatesAndAttendance = async () => {
    setLoading(true);
    try {
      // 1) Delegates of committee
      const { data: delegatesData, error: delErr } = await supabase
        .from('profiles')
        .select('id, full_name, country_id')
        .eq('committee_id', committeeId)
        .eq('role', 'delegate')
        .order('full_name', { ascending: true });

      if (delErr) {
        console.error('Error fetching delegates:', delErr);
        setLoading(false);
        return;
      }

      const delegates = (delegatesData as any[] | null) ?? [];
      setDelegates(delegates as Delegate[]);

      // 2) Attendance records (latest per delegate)
      const { data: attendanceData, error: attErr } = await (supabase as any)
        .from('asistencia')
        .select('*')
        .eq('committee_id', committeeId)
        .order('fecha', { ascending: false });

      if (attErr) {
        console.error('Error fetching attendance:', attErr);
      }

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (delegateId: string, presente: boolean) => {
    try {
      // Insert a new attendance record (assumes RLS allows committee secretaries)
      const { error } = await (supabase as any)
        .from('asistencia')
        .insert({
          committee_id: committeeId,
          profile_id: delegateId,
          presente,
        });

      if (error) {
        toast({ title: 'Error', description: 'No se pudo actualizar la asistencia', variant: 'destructive' });
        return;
      }

      setAttendanceMap((prev) => ({ ...prev, [delegateId]: presente }));
      toast({ title: 'Asistencia actualizada', description: presente ? 'Marcado como presente' : 'Marcado como ausente' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Ocurrió un problema al actualizar', variant: 'destructive' });
    }
  };

  const presentCount = useMemo(() => Object.values(attendanceMap).filter(s => s === true).length, [attendanceMap]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Control de Asistencia
        </CardTitle>
        <CardDescription>
          Marca asistencia de delegados del comité. Presentes: {presentCount}/{delegates.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-6">Cargando...</div>
        ) : delegates.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">No hay delegados asignados</div>
        ) : (
          <div className="divide-y border rounded-lg">
            {delegates.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{d.full_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {attendanceMap[d.id] ? (
                    <Badge variant="secondary" className="bg-success text-success-foreground">Presente</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Ausente</Badge>
                  )}
                  <Button
                    variant={attendanceMap[d.id] ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus(d.id, true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Presente
                  </Button>
                  <Button
                    variant={!attendanceMap[d.id] ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setStatus(d.id, false)}
                  >
                    <UserX className="h-4 w-4 mr-2" /> Ausente
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

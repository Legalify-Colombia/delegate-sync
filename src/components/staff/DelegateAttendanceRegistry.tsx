import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserCheck, UserX, Clock, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCurrentModel } from '@/hooks/useCurrentModel';

interface Delegate {
  id: string;
  full_name: string;
  Photo_url?: string;
  "Entidad que representa"?: string;
  countries?: {
    name: string;
    flag?: string;
    code: string;
  };
}

interface AttendanceRecord {
  id: string;
  delegate_id: string;
  status: 'present' | 'absent';
  check_in_time: string;
  notes?: string;
}

export default function DelegateAttendanceRegistry() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { currentModel } = useCurrentModel();
  const [searchTerm, setSearchTerm] = useState('');
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [filteredDelegates, setFilteredDelegates] = useState<Delegate[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingDelegate, setProcessingDelegate] = useState<string | null>(null);

  useEffect(() => {
    fetchDelegates();
    fetchAttendanceRecords();
  }, []);

  useEffect(() => {
    const filtered = delegates.filter(delegate =>
      delegate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delegate["Entidad que representa"] && 
       delegate["Entidad que representa"].toLowerCase().includes(searchTerm.toLowerCase())) ||
      (delegate.countries?.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredDelegates(filtered);
  }, [searchTerm, delegates]);

  const fetchDelegates = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          Photo_url,
          "Entidad que representa",
          countries (
            name,
            flag,
            code
          )
        `)
        .eq('role', 'delegate')
        .order('full_name');

      if (error) throw error;
      setDelegates(data || []);
    } catch (error) {
      console.error('Error fetching delegates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los delegados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_registry')
        .select('*')
        .gte('check_in_time', `${today}T00:00:00Z`)
        .lt('check_in_time', `${today}T23:59:59Z`)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setAttendanceRecords((data || []) as AttendanceRecord[]);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    }
  };

  const markAttendance = async (delegateId: string, status: 'present' | 'absent') => {
    if (!profile?.id) return;
    
    setProcessingDelegate(delegateId);
    try {
      // Check if there's already a record for today
      const today = new Date().toISOString().split('T')[0];
      const existingRecord = attendanceRecords.find(
        record => record.delegate_id === delegateId && 
        record.check_in_time.startsWith(today)
      );

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('attendance_registry')
          .update({
            status,
            check_in_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('attendance_registry')
          .insert({
            delegate_id: delegateId,
            staff_id: profile.id,
            status,
            check_in_time: new Date().toISOString(),
            model_id: currentModel?.id || '',
          });

        if (error) throw error;
      }

      await fetchAttendanceRecords();
      
      const delegate = delegates.find(d => d.id === delegateId);
      toast({
        title: "Registro actualizado",
        description: `${delegate?.full_name} marcado como ${status === 'present' ? 'Presente' : 'Ausente'}`,
      });
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la asistencia",
        variant: "destructive",
      });
    } finally {
      setProcessingDelegate(null);
    }
  };

  const getAttendanceStatus = (delegateId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.find(
      record => record.delegate_id === delegateId && 
      record.check_in_time.startsWith(today)
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Registro de Delegados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Registro de Delegados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, institución o país..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredDelegates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron delegados' : 'No hay delegados registrados'}
            </div>
          ) : (
            filteredDelegates.map((delegate) => {
              const attendanceRecord = getAttendanceStatus(delegate.id);
              const isProcessing = processingDelegate === delegate.id;

              return (
                <div
                  key={delegate.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={delegate.Photo_url} />
                      <AvatarFallback>
                        {delegate.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h4 className="font-semibold">{delegate.full_name}</h4>
                      {delegate["Entidad que representa"] && (
                        <p className="text-sm text-muted-foreground">
                          {delegate["Entidad que representa"]}
                        </p>
                      )}
                      {delegate.countries && (
                        <div className="flex items-center gap-2 mt-1">
                          {delegate.countries.flag ? (
                            <span className="text-lg">{delegate.countries.flag}</span>
                          ) : (
                            <Flag className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {delegate.countries.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {attendanceRecord && (
                      <div className="text-right">
                        <Badge 
                          variant={attendanceRecord.status === 'present' ? 'default' : 'destructive'}
                          className="mb-1"
                        >
                          {attendanceRecord.status === 'present' ? 'Presente' : 'Ausente'}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(attendanceRecord.check_in_time).toLocaleTimeString()}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={attendanceRecord?.status === 'present' ? 'default' : 'outline'}
                        onClick={() => markAttendance(delegate.id, 'present')}
                        disabled={isProcessing}
                        className="min-w-[85px]"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        {isProcessing ? '...' : 'Presente'}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={attendanceRecord?.status === 'absent' ? 'destructive' : 'outline'}
                        onClick={() => markAttendance(delegate.id, 'absent')}
                        disabled={isProcessing}
                        className="min-w-[85px]"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        {isProcessing ? '...' : 'Ausente'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
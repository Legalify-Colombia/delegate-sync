import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  committee_id: string | null;
  country_id: string | null;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Administrador',
      secretary_general: 'Secretario General',
      committee_secretary: 'Secretario de Comité',
      communications_secretary: 'Secretario de Comunicaciones',
      delegate: 'Delegado',
      staff: 'Staff',
      press: 'Prensa',
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      admin: 'bg-red-500',
      secretary_general: 'bg-purple-500',
      committee_secretary: 'bg-blue-500',
      communications_secretary: 'bg-green-500',
      delegate: 'bg-gray-500',
      staff: 'bg-yellow-500',
      press: 'bg-orange-500',
    };
    return colorMap[role] || 'bg-gray-500';
  };

  if (loading) {
    return <div>Cargando usuarios...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription>Administra los usuarios del sistema MUN</CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Usuario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold">{user.full_name}</h3>
                  <Badge 
                    variant="secondary" 
                    className={`${getRoleColor(user.role)} text-white`}
                  >
                    {getRoleDisplay(user.role)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Registrado: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ExtendedProfile, ExtendedCommittee, Country } from '@/integrations/supabase/custom-types';

// Use imported types
type Profile = ExtendedProfile;
type Committee = ExtendedCommittee;

interface UserFormData {
  full_name: string;
  email: string;
  password: string;
  role: string;
  committee_id: string;
  country_id: string;
}

export default function UserManagementByModel() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    password: '',
    role: 'delegate',
    committee_id: '',
    country_id: ''
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.model_id) {
      fetchUsers();
      fetchCommittees();
      fetchCountries();
    }
  }, [profile]);

  const fetchUsers = async () => {
    if (!profile?.model_id) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        countries(name),
        committees(name)
      `)
      .eq('model_id', profile.model_id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } else {
      const processedUsers: Profile[] = (data || []).map((user: any) => ({
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        committee_id: user.committee_id,
        country_id: user.country_id,
        model_id: user.model_id,
        created_at: user.created_at,
        updated_at: user.updated_at,
        Photo_url: user.Photo_url,
        "Entidad que representa": user["Entidad que representa"]
      }));
      setUsers(processedUsers);
    }

    setLoading(false);
  };

  const fetchCommittees = async () => {
    if (!profile?.model_id) return;
    
    const { data } = await supabase
      .from('committees')
      .select('id, name, topic, current_status, model_id, created_at, updated_at, session_started_at, session_accumulated_seconds, current_timer_end, current_timer_remaining_seconds')
      .eq('model_id', profile.model_id)
      .order('name');
    setCommittees((data as any) || []);
  };

  const fetchCountries = async () => {
    const { data } = await supabase
      .from('countries')
      .select('*')
      .order('name');
    setCountries((data as any) || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast({
        title: "Error",
        description: "Nombre y email son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          full_name: formData.full_name.trim(),
          role: formData.role,
        };

        if (formData.committee_id) updateData.committee_id = formData.committee_id;
        if (formData.country_id) updateData.country_id = formData.country_id;

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Usuario actualizado correctamente",
        });
      } else {
        // Create new user via auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name.trim(),
              role: formData.role,
              committee_id: formData.committee_id || null,
              country_id: formData.country_id || null,
              model_id: profile?.model_id
            }
          }
        });

        if (authError) throw authError;
        
        toast({
          title: "Éxito",
          description: "Usuario creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingUser(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'delegate',
        committee_id: '',
        country_id: ''
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: '', // Don't pre-fill email for security
      password: '',
      role: user.role,
      committee_id: user.committee_id || '',
      country_id: user.country_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      toast({
        title: "Error",
        description: "Error al eliminar el usuario",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Usuario eliminado correctamente",
      });
      fetchUsers();
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'delegate',
      committee_id: '',
      country_id: ''
    });
    setEditingUser(null);
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

  // Only allow Secretary General to create users for their model
  const canCreateUsers = profile?.role === 'secretary_general' && profile?.model_id;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Usuarios del Modelo</CardTitle>
            <CardDescription>Administra los usuarios de tu modelo MUN</CardDescription>
          </div>
          {canCreateUsers && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser ? 'Modifica los datos del usuario' : 'Ingresa los datos del nuevo usuario'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Juan Pérez"
                      required
                    />
                  </div>
                  {!editingUser && (
                    <>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="juan@ejemplo.com"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Mínimo 6 caracteres"
                          minLength={6}
                          required
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="role">Rol</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="committee_secretary">Secretario de Comité</SelectItem>
                        <SelectItem value="communications_secretary">Secretario de Comunicaciones</SelectItem>
                        <SelectItem value="delegate">Delegado</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="press">Prensa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.role === 'delegate' || formData.role === 'committee_secretary') && (
                    <div>
                      <Label htmlFor="committee">Comité</Label>
                      <Select value={formData.committee_id} onValueChange={(value) => setFormData({ ...formData, committee_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un comité" />
                        </SelectTrigger>
                        <SelectContent>
                          {committees.map((committee) => (
                            <SelectItem key={committee.id} value={committee.id}>
                              {committee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.role === 'delegate' && (
                    <div>
                      <Label htmlFor="country">País</Label>
                      <Select value={formData.country_id} onValueChange={(value) => setFormData({ ...formData, country_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un país" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.id} value={country.id}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="submit">
                      {editingUser ? 'Actualizar' : 'Crear'} Usuario
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
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
              {canCreateUsers && (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
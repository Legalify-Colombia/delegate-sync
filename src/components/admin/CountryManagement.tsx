import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Country {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

interface CountryFormData {
  name: string;
  code: string;
}

export default function CountryManagement() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState<CountryFormData>({ name: '', code: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los países",
        variant: "destructive",
      });
    } else {
      setCountries(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCountry) {
        const { error } = await supabase
          .from('countries')
          .update({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
          })
          .eq('id', editingCountry.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "País actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('countries')
          .insert({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
          });

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "País creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingCountry(null);
      setFormData({ name: '', code: '' });
      fetchCountries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar el país",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    setFormData({ name: country.name, code: country.code });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este país?')) return;

    const { error } = await supabase
      .from('countries')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Error al eliminar el país",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "País eliminado correctamente",
      });
      fetchCountries();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', code: '' });
    setEditingCountry(null);
  };

  if (loading) {
    return <div className="flex justify-center py-8">Cargando países...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Gestión de Países
            </CardTitle>
            <CardDescription>Administra los países participantes en el MUN</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Agregar País
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCountry ? 'Editar País' : 'Agregar Nuevo País'}
                </DialogTitle>
                <DialogDescription>
                  {editingCountry ? 'Modifica los datos del país' : 'Ingresa los datos del nuevo país'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del País</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej: Estados Unidos"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">Código del País</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="ej: USA, CHN, FRA"
                    maxLength={3}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingCountry ? 'Actualizar' : 'Crear'} País
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {countries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay países registrados. ¡Agrega el primer país!
            </div>
          ) : (
            countries.map((country) => (
              <div key={country.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold">{country.name}</h3>
                    <span className="text-sm bg-muted px-2 py-1 rounded text-muted-foreground font-mono">
                      {country.code}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Registrado: {new Date(country.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(country)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(country.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
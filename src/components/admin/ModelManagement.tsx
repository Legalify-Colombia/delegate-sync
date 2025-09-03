import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Upload, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import { Model, SafeSupabaseQuery } from '@/integrations/supabase/custom-types';

// Remove local Model interface since we're importing it
interface ModelFormData {
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  logo_url: string;
}

export default function ModelManagement() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState<ModelFormData>({
    name: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    logo_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      // Use Supabase client with proper types
      const { data: modelsData, error } = await supabase
        .from('models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process models data with participant counts
      const modelsWithCount: Model[] = [];
      
      for (const model of (modelsData || [])) {
        // Fetch participant count for each model
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('model_id', model.id);
          
        modelsWithCount.push({
          id: model.id,
          name: model.name,
          description: model.description,
          location: model.location,
          start_date: model.start_date,
          end_date: model.end_date,
          logo_url: model.logo_url,
          created_at: model.created_at,
          participant_count: count || 0
        });
      }

      setModels(modelsWithCount);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los modelos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del modelo es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      const modelData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        logo_url: formData.logo_url || null
      };

      if (editingModel) {
        const { error } = await supabase
          .from('models')
          .update(modelData)
          .eq('id', editingModel.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Modelo actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('models')
          .insert([modelData]);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Modelo creado correctamente",
        });
      }

      setIsDialogOpen(false);
      setEditingModel(null);
      resetForm();
      fetchModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar el modelo",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      description: model.description || '',
      location: model.location || '',
      start_date: model.start_date ? model.start_date.split('T')[0] : '',
      end_date: model.end_date ? model.end_date.split('T')[0] : '',
      logo_url: model.logo_url || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este modelo? Esto también eliminará todos los datos asociados.')) return;

    try {
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Modelo eliminado correctamente",
      });
      fetchModels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al eliminar el modelo",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      start_date: '',
      end_date: '',
      logo_url: ''
    });
    setEditingModel(null);
  };

  if (loading) {
    return <div>Cargando modelos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gestión de Modelos MUN</CardTitle>
            <CardDescription>Administra los diferentes modelos de Naciones Unidas</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear Modelo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? 'Editar Modelo' : 'Crear Nuevo Modelo'}
                </DialogTitle>
                <DialogDescription>
                  {editingModel ? 'Modifica los datos del modelo' : 'Ingresa los datos del nuevo modelo MUN'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Modelo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej. LEGALUN 2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Breve descripción del modelo..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="ej. Universidad Nacional, Bogotá"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Fecha de Inicio</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Fecha de Fin</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="logo">Logo del Modelo</Label>
                  <ImageUpload
                    onImageUploaded={(url) => setFormData({ ...formData, logo_url: url })}
                    currentImage={formData.logo_url}
                    label="Logo del Modelo"
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingModel ? 'Actualizar' : 'Crear'} Modelo
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    {model.location && (
                      <CardDescription className="mt-1">{model.location}</CardDescription>
                    )}
                  </div>
                  {model.logo_url && (
                    <img 
                      src={model.logo_url} 
                      alt={`${model.name} logo`} 
                      className="h-12 w-12 object-contain ml-2"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {model.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {model.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{model.participant_count} participantes</span>
                  </div>
                  {model.start_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(model.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(model)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(model.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
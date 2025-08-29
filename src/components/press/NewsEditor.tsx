import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Send, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Committee {
  id: string;
  name: string;
}

interface NewsPublication {
  id: string;
  title: string;
  content: string;
  committee_id: string | null;
  cover_image_url: string | null;
  status: 'draft' | 'submitted_for_review' | 'approved' | 'rejected' | 'published_internal';
  created_at: string;
  updated_at: string;
  committees?: { name: string };
}

export default function NewsEditor() {
  const { profile } = useAuth();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [publications, setPublications] = useState<NewsPublication[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCommittee, setSelectedCommittee] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [editingPublication, setEditingPublication] = useState<NewsPublication | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchCommittees();
    fetchPublications();
  }, []);

  const fetchCommittees = async () => {
    const { data, error } = await supabase
      .from('committees')
      .select('id, name')
      .order('name');

    if (!error) {
      setCommittees(data || []);
    }
  };

  const fetchPublications = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('news_publications')
      .select(`
        *,
        committees (name)
      `)
      .eq('author_id', profile.id)
      .order('updated_at', { ascending: false });

    if (!error) {
      setPublications((data as any) || []);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedCommittee('');
    setCoverImageUrl('');
    setEditingPublication(null);
  };

  const handleSave = async (status: 'draft' | 'submitted_for_review' | 'published_internal') => {
    if (!profile || !title.trim() || !content.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa título y contenido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const publicationData = {
      title: title.trim(),
      content: content.trim(),
      committee_id: selectedCommittee || null,
      cover_image_url: coverImageUrl || null,
      status,
      author_id: profile.id,
    };

    let error;

    if (editingPublication) {
      // Update existing publication
      const { error: updateError } = await supabase
        .from('news_publications')
        .update(publicationData)
        .eq('id', editingPublication.id);
      error = updateError;
    } else {
      // Create new publication
      const { error: insertError } = await supabase
        .from('news_publications')
        .insert(publicationData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la publicación",
        variant: "destructive",
      });
    } else {
      const messages = {
        draft: 'Borrador guardado correctamente',
        submitted_for_review: 'Publicación enviada para revisión',
        published_internal: 'Publicación enviada como noticia interna',
      };

      toast({
        title: "Éxito",
        description: messages[status],
      });

      resetForm();
      fetchPublications();
      setActiveTab('list');
    }
  };

  const handleEdit = (publication: NewsPublication) => {
    setEditingPublication(publication);
    setTitle(publication.title);
    setContent(publication.content);
    setSelectedCommittee(publication.committee_id || '');
    setCoverImageUrl(publication.cover_image_url || '');
    setActiveTab('create');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Borrador', variant: 'secondary' as const },
      submitted_for_review: { label: 'En Revisión', variant: 'default' as const },
      approved: { label: 'Aprobado', variant: 'default' as const },
      rejected: { label: 'Rechazado', variant: 'destructive' as const },
      published_internal: { label: 'Publicado Internamente', variant: 'default' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'submitted_for_review': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'published_internal': return <Eye className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Editor de Noticias</span>
        </CardTitle>
        <CardDescription>
          Crea y gestiona publicaciones de prensa sobre los comités
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">
              {editingPublication ? 'Editar' : 'Crear'} Publicación
            </TabsTrigger>
            <TabsTrigger value="list">Mis Publicaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título de la Noticia</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título llamativo para la noticia..."
                />
              </div>

              <div>
                <Label htmlFor="committee">Comité (Opcional)</Label>
                <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el comité relacionado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin comité específico</SelectItem>
                    {committees.map((committee) => (
                      <SelectItem key={committee.id} value={committee.id}>
                        {committee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="coverImage">URL de Imagen de Portada (Opcional)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="coverImage"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="content">Contenido de la Noticia</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe el contenido completo de la noticia..."
                  rows={8}
                />
              </div>

              {coverImageUrl && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Vista previa de imagen</span>
                  </h4>
                  <img 
                    src={coverImageUrl} 
                    alt="Vista previa" 
                    className="max-w-xs max-h-32 object-cover rounded"
                    onError={() => setCoverImageUrl('')}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleSave('draft')}
                  variant="outline"
                  disabled={loading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Guardar Borrador
                </Button>
                
                <Button
                  onClick={() => handleSave('submitted_for_review')}
                  disabled={loading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Revisión
                </Button>
                
                <Button
                  onClick={() => handleSave('published_internal')}
                  variant="secondary"
                  disabled={loading}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Publicar Internamente
                </Button>

                {editingPublication && (
                  <Button onClick={resetForm} variant="ghost">
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {publications.length > 0 ? (
              <div className="space-y-4">
                {publications.map((publication) => (
                  <div key={publication.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusIcon(publication.status)}
                          <h4 className="font-semibold">{publication.title}</h4>
                          {getStatusBadge(publication.status)}
                        </div>
                        {publication.committees && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Comité: {publication.committees.name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {publication.content}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {(publication.status === 'draft' || publication.status === 'rejected') && (
                          <Button
                            onClick={() => handleEdit(publication)}
                            size="sm"
                            variant="outline"
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Creado: {new Date(publication.created_at).toLocaleString()}
                      {publication.updated_at !== publication.created_at && (
                        <span> • Actualizado: {new Date(publication.updated_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tienes publicaciones aún</p>
                <Button onClick={() => setActiveTab('create')} className="mt-2">
                  Crear tu primera publicación
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
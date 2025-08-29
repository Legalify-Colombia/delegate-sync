import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function DelegateNotes() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchNotes();
    }
  }, [profile]);

  const fetchNotes = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('delegate_notes')
      .select('*')
      .eq('delegate_id', profile.id)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las notas",
        variant: "destructive",
      });
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile || !title.trim() || !content.trim()) return;

    if (editingNote) {
      // Update existing note
      const { error } = await supabase
        .from('delegate_notes')
        .update({
          title: title.trim(),
          content: content.trim(),
        })
        .eq('id', editingNote.id);

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la nota",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Nota actualizada correctamente",
        });
        fetchNotes();
        resetForm();
      }
    } else {
      // Create new note
      const { error } = await supabase
        .from('delegate_notes')
        .insert({
          delegate_id: profile.id,
          title: title.trim(),
          content: content.trim(),
        });

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear la nota",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Éxito",
          description: "Nota creada correctamente",
        });
        fetchNotes();
        resetForm();
      }
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsDialogOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    const { error } = await supabase
      .from('delegate_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Nota eliminada correctamente",
      });
      fetchNotes();
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingNote(null);
    setIsDialogOpen(false);
  };

  if (loading) {
    return <div className="flex justify-center p-4">Cargando notas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Mis Notas Privadas</span>
            </CardTitle>
            <CardDescription>Toma notas que solo tú puedes ver</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Nota
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingNote ? 'Editar Nota' : 'Nueva Nota'}
                </DialogTitle>
                <DialogDescription>
                  {editingNote ? 'Modifica tu nota privada' : 'Crea una nueva nota privada'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Título</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título de la nota"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Contenido</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escribe tu nota aquí..."
                    rows={6}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
                    {editingNote ? 'Actualizar' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{note.title}</h4>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(note)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(note.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                  {note.content}
                </p>
                <p className="text-xs text-muted-foreground">
                  Actualizado: {new Date(note.updated_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No tienes notas aún. ¡Crea tu primera nota!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
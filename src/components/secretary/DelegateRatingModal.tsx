import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Star, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Delegate {
  id: string;
  full_name: string;
  countries?: { name: string };
}

interface RatingCriteria {
  personal_presentation: number;
  speech_appreciation: number;
  additional_interventions: number;
  counterproposal_quality: number;
  dispositions_quality: number;
  comments: string;
}

interface DelegateRatingModalProps {
  delegate: Delegate | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DelegateRatingModal({ delegate, isOpen, onClose }: DelegateRatingModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [ratings, setRatings] = useState<RatingCriteria>({
    personal_presentation: 5,
    speech_appreciation: 5,
    additional_interventions: 5,
    counterproposal_quality: 5,
    dispositions_quality: 5,
    comments: '',
  });
  const [existingRating, setExistingRating] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (delegate && profile && isOpen) {
      fetchExistingRating();
    }
  }, [delegate, profile, isOpen]);

  const fetchExistingRating = async () => {
    if (!profile || !delegate) return;

    const { data, error } = await supabase
      .from('detailed_ratings')
      .select('*')
      .eq('secretary_id', profile.id)
      .eq('delegate_id', delegate.id)
      .eq('committee_id', profile.committee_id)
      .maybeSingle();

    if (!error && data) {
      setExistingRating(data);
      setRatings({
        personal_presentation: data.personal_presentation,
        speech_appreciation: data.speech_appreciation,
        additional_interventions: data.additional_interventions,
        counterproposal_quality: data.counterproposal_quality,
        dispositions_quality: data.dispositions_quality,
        comments: data.comments || '',
      });
    } else {
      setExistingRating(null);
      setRatings({
        personal_presentation: 5,
        speech_appreciation: 5,
        additional_interventions: 5,
        counterproposal_quality: 5,
        dispositions_quality: 5,
        comments: '',
      });
    }
  };

  const handleRatingChange = (criterion: keyof Omit<RatingCriteria, 'comments'>, value: number) => {
    setRatings(prev => ({ ...prev, [criterion]: value }));
  };

  const handleSave = async () => {
    if (!profile || !delegate) return;

    setLoading(true);

    const ratingData = {
      secretary_id: profile.id,
      delegate_id: delegate.id,
      committee_id: profile.committee_id!,
      ...ratings,
    };

    let error;

    if (existingRating) {
      // Update existing rating
      const { error: updateError } = await supabase
        .from('detailed_ratings')
        .update(ratingData)
        .eq('id', existingRating.id);
      error = updateError;
    } else {
      // Create new rating
      const { error: insertError } = await supabase
        .from('detailed_ratings')
        .insert(ratingData);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la calificación",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Calificación guardada",
        description: "La evaluación del delegado ha sido guardada correctamente",
      });
      onClose();
    }
  };

  const criteriaLabels = {
    personal_presentation: 'Presentación Personal',
    speech_appreciation: 'Apreciación de la Ponencia',
    additional_interventions: 'Intervenciones Adicionales',
    counterproposal_quality: 'Calidad de Contrapropuesta',
    dispositions_quality: 'Calidad de Disposiciones',
  };

  const criteriaDescriptions = {
    personal_presentation: 'Vestimenta, postura, y profesionalismo general',
    speech_appreciation: 'Claridad, estructura y contenido de las ponencias principales',
    additional_interventions: 'Participación activa en debates y discusiones',
    counterproposal_quality: 'Creatividad y viabilidad de las contrapropuestas',
    dispositions_quality: 'Efectividad y realismo de las disposiciones propuestas',
  };

  if (!delegate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Calificar Delegado</span>
          </DialogTitle>
          <DialogDescription>
            Evaluación detallada para {delegate.full_name} - {delegate.countries?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(criteriaLabels).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">
                    {criteriaDescriptions[key as keyof typeof criteriaDescriptions]}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">
                    {ratings[key as keyof Omit<RatingCriteria, 'comments'>]}/10
                  </span>
                </div>
              </div>
              <Slider
                value={[ratings[key as keyof Omit<RatingCriteria, 'comments'>]]}
                onValueChange={(value) => 
                  handleRatingChange(key as keyof Omit<RatingCriteria, 'comments'>, value[0])
                }
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 - Deficiente</span>
                <span>10 - Excelente</span>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="comments">Comentarios Adicionales</Label>
            <Textarea
              id="comments"
              value={ratings.comments}
              onChange={(e) => setRatings(prev => ({ ...prev, comments: e.target.value }))}
              placeholder="Escribe comentarios adicionales sobre el desempeño del delegado..."
              rows={4}
            />
          </div>

          {/* Rating Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Resumen de Calificación</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {Object.entries(criteriaLabels).map(([key, label]) => (
                <div key={key} className="flex justify-between">
                  <span className="truncate">{label}:</span>
                  <span className="font-medium">
                    {ratings[key as keyof Omit<RatingCriteria, 'comments'>]}/10
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t flex justify-between">
              <span className="font-semibold">Promedio:</span>
              <span className="font-bold text-primary">
                {(
                  (ratings.personal_presentation + 
                   ratings.speech_appreciation + 
                   ratings.additional_interventions + 
                   ratings.counterproposal_quality + 
                   ratings.dispositions_quality) / 5
                ).toFixed(1)}/10
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {existingRating && (
                <span>Última actualización: {new Date(existingRating.created_at).toLocaleDateString()}</span>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : (existingRating ? 'Actualizar' : 'Guardar')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
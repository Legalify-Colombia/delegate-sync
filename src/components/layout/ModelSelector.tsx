import { useState, useEffect } from 'react';
import { Check, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentModel } from '@/hooks/useCurrentModel';
import { cn } from '@/lib/utils';

// Model option for selector
interface ModelOption {
  id: string;
  name: string;
  logo_url: string | null;
}

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const { profile } = useAuth();
  const { currentModel, setCurrentModel, loading } = useCurrentModel();

  useEffect(() => {
    fetchAvailableModels();
  }, [profile]);

  const fetchAvailableModels = async () => {
    if (!profile) return;

    try {
      if (profile.role === 'admin') {
        // Admin can see all models
        const { data, error } = await supabase
          .from('models')
          .select('id, name, logo_url')
          .order('name');
        
        if (error) throw error;
        setModels(data || []);
      } else {
        // Users can only see their assigned model
        if (profile.model_id) {
          const { data, error } = await supabase
            .from('models')
            .select('id, name, logo_url')
            .eq('id', profile.model_id)
            .single();
          
          if (error) throw error;
          setModels([data]);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const handleModelSelect = async (modelId: string) => {
    await setCurrentModel(modelId);
    setOpen(false);
  };

  // Don't show selector if user has no models or only one model (unless admin)
  if (!currentModel || (models.length <= 1 && profile?.role !== 'admin')) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px] bg-white/50 backdrop-blur-sm"
          disabled={loading}
        >
          <div className="flex items-center gap-2">
            {currentModel?.logo_url ? (
              <img 
                src={currentModel.logo_url} 
                alt={currentModel.name}
                className="h-5 w-5 object-contain"
              />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            <span className="truncate">
              {currentModel?.name || "Seleccionar modelo"}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Buscar modelo..." />
          <CommandEmpty>No se encontraron modelos.</CommandEmpty>
          <CommandGroup>
            {models.map((model) => (
              <CommandItem
                key={model.id}
                onSelect={() => handleModelSelect(model.id)}
                className="flex items-center gap-2"
              >
                {model.logo_url ? (
                  <img 
                    src={model.logo_url} 
                    alt={model.name}
                    className="h-4 w-4 object-contain"
                  />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                <span className="flex-1 truncate">{model.name}</span>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    currentModel?.id === model.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
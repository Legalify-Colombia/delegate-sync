import { useState, useEffect } from 'react';
import { Check, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
      const SUPABASE_URL = "https://lsfmaelgwxoqcmzkmaba.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZm1hZWxnd3hvcWNtemttYWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE1NjUsImV4cCI6MjA3MTc5NzU2NX0.HqX9840nRL48pN4nSX-o2SaRtoxfomaIPK7gkgSSc34";
      
      if (profile.role === 'admin') {
        // Admin can see all models
        const response = await fetch(`${SUPABASE_URL}/rest/v1/models?select=id,name,logo_url&order=name`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setModels(data || []);
        }
      } else {
        // Users can only see their assigned model
        if (profile.model_id) {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/models?select=id,name,logo_url&id=eq.${profile.model_id}`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setModels(data || []);
          }
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
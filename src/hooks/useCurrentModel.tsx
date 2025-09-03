import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface Model {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  logo_url: string;
}

interface CurrentModelContextType {
  currentModel: Model | null;
  setCurrentModel: (modelId: string) => Promise<void>;
  loading: boolean;
}

const CurrentModelContext = createContext<CurrentModelContextType | undefined>(undefined);

interface CurrentModelProviderProps {
  children: ReactNode;
}

export function CurrentModelProvider({ children }: CurrentModelProviderProps) {
  const [currentModel, setCurrentModelState] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.model_id) {
      fetchCurrentModel(profile.model_id);
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchCurrentModel = async (modelId: string) => {
    try {
      const { data, error } = await supabase
        .from('models' as any)
        .select('*')
        .eq('id', modelId)
        .single();

      if (error) throw error;
      setCurrentModelState(data as any);
    } catch (error: any) {
      console.error('Error fetching current model:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentModel = async (modelId: string) => {
    try {
      setLoading(true);
      
      // Set the current model in the database session
      const { data, error } = await supabase.rpc('set_current_model' as any, { 
        model_id_to_set: modelId 
      });

      if (error) throw error;

      // Fetch the model details
      await fetchCurrentModel(modelId);
      
      toast({
        title: "Éxito",
        description: "Modelo activo cambiado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al cambiar el modelo activo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CurrentModelContext.Provider 
      value={{ 
        currentModel, 
        setCurrentModel, 
        loading 
      }}
    >
      {children}
    </CurrentModelContext.Provider>
  );
}

export function useCurrentModel() {
  const context = useContext(CurrentModelContext);
  if (context === undefined) {
    throw new Error('useCurrentModel must be used within a CurrentModelProvider');
  }
  return context;
}
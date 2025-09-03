import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { Model } from '@/integrations/supabase/custom-types';

// Use imported Model interface

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
      const SUPABASE_URL = "https://lsfmaelgwxoqcmzkmaba.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZm1hZWxnd3hvcWNtemttYWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjE1NjUsImV4cCI6MjA3MTc5NzU2NX0.HqX9840nRL48pN4nSX-o2SaRtoxfomaIPK7gkgSSc34";
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/models?select=*&id=eq.${modelId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setCurrentModelState(data[0] as Model);
        }
      }
    } catch (error: any) {
      console.error('Error fetching current model:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentModel = async (modelId: string) => {
    try {
      setLoading(true);
      
      // For now, just set the model without calling the RPC function
      // TODO: Implement set_current_model RPC when types are available
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
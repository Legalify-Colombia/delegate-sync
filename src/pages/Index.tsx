import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogIn } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-5xl font-bold mb-4 text-primary">The Resolution Hub</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Sistema de Gestión y Administración de Modelos de Naciones Unidas
        </p>
        <Button asChild size="lg" className="w-full">
          <a href="/auth">
            <LogIn className="h-5 w-5 mr-2" />
            Iniciar Sesión
          </a>
        </Button>
      </div>
    </div>
  );
};

export default Index;

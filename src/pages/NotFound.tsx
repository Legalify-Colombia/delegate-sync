import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Logo } from "@/components/ui/logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">Página no encontrada</p>
          <a href="/" className="inline-block text-primary hover:text-primary/80 underline transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, Globe } from 'lucide-react';
import React from 'react';

// Componente para el ícono del globo terráqueo animado
const AnimatedGlobe = () => (
  <div className="relative flex items-center justify-center w-full h-full">
    <div className="absolute w-full h-full max-w-lg max-h-lg">
      <svg
        className="animate-[spin_20s_linear_infinite]"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="45" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" fill="none" />
        <circle cx="50" cy="50" r="35" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" fill="none" />
        <circle cx="50" cy="50" r="25" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" fill="none" />
      </svg>
    </div>
    <Globe className="w-48 h-48 text-cyan-400/50" />
  </div>
);

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Cargando...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(22,163,74,0.1),_transparent_40%)]"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,_rgba(22,78,99,0.2),_transparent_60%)]"></div>
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-16 max-w-6xl w-full">
          {/* Columna de Texto (Adaptable a móviles) */}
          <div className="text-center md:text-left animate-[fade-in-up_1s_ease-out]">
            <div className="inline-block bg-cyan-900/50 text-cyan-300 rounded-full p-3 mb-6 border border-cyan-700">
              <Globe className="h-8 w-8" />
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text 
                           bg-gradient-to-r from-white via-cyan-300 to-white
                           bg-[length:200%_auto] animate-[gradient-scroll_3s_linear_infinite]">
              The Resolution Hub
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-2">
              Sistema de Gestión y Administración de Modelos de Naciones Unidas.
            </p>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto md:mx-0">
              Una plataforma integral para optimizar la diplomacia, facilitar la colaboración y agilizar la creación de resoluciones.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/20">
              <a href="/auth">
                <LogIn className="h-5 w-5 mr-2" />
                Iniciar Sesión
              </a>
            </Button>
          </div>

          {/* Columna del Globo (Oculta en móviles para mejor visualización) */}
          <div className="hidden md:flex items-center justify-center h-full animate-[fade-in_1s_ease-out]">
            <AnimatedGlobe />
          </div>
        </div>
      </main>
    </div>
  );
};

// Recordatorio: Agrega las keyframes para la animación del gradiente en tu configuración de Tailwind CSS.
/*
En tailwind.config.js (recomendado):
theme: {
  extend: {
    animation: {
      'gradient-scroll': 'gradient-scroll 3s linear infinite',
    },
    keyframes: {
      'gradient-scroll': {
        to: { 'background-position': '200% center' },
      }
    }
  }
}
*/

export default Index;


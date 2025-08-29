import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Bell, Settings, MessageSquare, Clock, Vote, Star, Newspaper } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navigationItems = {
  admin: [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Usuarios', path: '/dashboard?tab=users' },
    { icon: Settings, label: 'Comités', path: '/dashboard?tab=committees' },
    { icon: Bell, label: 'Sistema', path: '/dashboard?tab=system' },
  ],
  secretary_general: [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Supervisión', path: '/dashboard?tab=oversight' },
    { icon: Bell, label: 'Comunicación', path: '/dashboard?tab=communication' },
    { icon: Newspaper, label: 'Noticias', path: '/news' },
  ],
  committee_secretary: [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Clock, label: 'Debate', path: '/dashboard?tab=timer' },
    { icon: Vote, label: 'Votación', path: '/dashboard?tab=voting' },
    { icon: Star, label: 'Calificar', path: '/dashboard?tab=rating' },
    { icon: MessageSquare, label: 'Solicitudes', path: '/dashboard?tab=requests' },
  ],
  communications_secretary: [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Bell, label: 'Anuncios', path: '/dashboard?tab=announcements' },
    { icon: FileText, label: 'Documentos', path: '/dashboard?tab=documents' },
    { icon: Newspaper, label: 'Noticias', path: '/news' },
  ],
  delegate: [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Clock, label: 'Debate', path: '/dashboard?tab=timer' },
    { icon: Vote, label: 'Votar', path: '/dashboard?tab=voting' },
    { icon: FileText, label: 'Mis Notas', path: '/dashboard?tab=notes' },
    { icon: MessageSquare, label: 'Turno', path: '/dashboard?tab=speaking' },
    { icon: Newspaper, label: 'Noticias', path: '/news' },
  ],
  staff: [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageSquare, label: 'Solicitudes', path: '/dashboard?tab=requests' },
    { icon: Newspaper, label: 'Noticias', path: '/news' },
  ],
  press: [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Publicaciones', path: '/dashboard?tab=publications' },
    { icon: Newspaper, label: 'Noticias', path: '/news' },
  ],
};

export default function MobileNavigation() {
  const { profile } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  const userNavItems = navigationItems[profile.role] || [];

  return (
    <div className="md:hidden">
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {userNavItems.slice(0, 5).map((item) => {
            const isActive = location.pathname + location.search === item.path || 
                           (item.path === '/dashboard' && location.pathname === '/dashboard' && !location.search);
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 text-xs transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
      
      {/* Content padding to account for bottom nav */}
      <div className="h-16" />
    </div>
  );
}
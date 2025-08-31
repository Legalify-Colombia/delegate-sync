import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { profile, signOut } = useAuth();
  const [countryInfo, setCountryInfo] = useState<{ name: string; flag: string } | null>(null);

  useEffect(() => {
    const fetchCountryInfo = async () => {
      if (profile?.role === 'delegate' && profile.country_id) {
        try {
          const { data: country, error } = await supabase
            .from('countries')
            .select('name, flag')
            .eq('id', profile.country_id)
            .single();
          
          if (country && !error) {
            setCountryInfo(country);
          }
        } catch (err) {
          console.error('Error fetching country info:', err);
        }
      }
    };

    fetchCountryInfo();
  }, [profile?.country_id, profile?.role]);

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Administrador',
      secretary_general: 'Secretario General',
      committee_secretary: 'Secretario de Comité',
      communications_secretary: 'Secretario de Comunicaciones',
      delegate: 'Delegado',
      staff: 'Staff',
      press: 'Prensa',
    };
    return roleMap[role] || role;
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Logo size="md" />
          {profile && (
            <div className="text-sm text-muted-foreground hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-medium">{profile.full_name}</span>
                {profile.role === 'delegate' && countryInfo && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="flex items-center gap-1">
                      <span className="text-base">{countryInfo.flag || '🏳️'}</span>
                      <span>{countryInfo.name}</span>
                    </span>
                  </>
                )}
                <span className="mx-2">•</span>
                <span>{getRoleDisplay(profile.role)}</span>
              </div>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Mi Cuenta</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
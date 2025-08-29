import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('delegate');
  const [committeeId, setCommitteeId] = useState('');
  const [countryId, setCountryId] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [committees, setCommittees] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    if (!isLogin) {
      fetchCommittees();
      fetchCountries();
    }
  }, [isLogin]);

  const fetchCommittees = async () => {
    const { data, error } = await supabase
      .from('committees')
      .select('id, name');
    if (!error) {
      setCommittees(data || []);
    }
  };

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name');
    if (!error) {
      setCountries(data || []);
    }
  };

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password, fullName, role, committeeId, countryId);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">MUN Manager</h1>
          <p className="text-muted-foreground">Sistema de Gestión de Modelo de Naciones Unidas</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{isLogin ? 'Iniciar Sesión' : 'Registro'}</CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Ingresa tus credenciales para acceder al sistema'
                : 'Crea una nueva cuenta para acceder al sistema'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre Completo</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Ingresa tu nombre completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delegate">Delegado</SelectItem>
                        <SelectItem value="committee_secretary">Secretario de Comité</SelectItem>
                        <SelectItem value="communications_secretary">Secretario de Comunicaciones</SelectItem>
                        <SelectItem value="secretary_general">Secretario General</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="press">Prensa</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(role === 'delegate') && (
                    <div className="space-y-2">
                      <Label htmlFor="country">País</Label>
                      <Select value={countryId} onValueChange={setCountryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un país" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.id} value={country.id}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(role === 'committee_secretary') && (
                    <div className="space-y-2">
                      <Label htmlFor="committee">Comité</Label>
                      <Select value={committeeId} onValueChange={setCommitteeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un comité" />
                        </SelectTrigger>
                        <SelectContent>
                          {committees.map((committee) => (
                            <SelectItem key={committee.id} value={committee.id}>
                              {committee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Tu contraseña"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline"
              >
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
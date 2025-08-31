import { useState, useEffect, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Scale, ShieldCheck, Zap, Users } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function Auth() {
  // --- Toda tu lógica original se mantiene intacta ---
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
    const { data, error } = await supabase.from('committees').select('id, name');
    if (!error) {
      setCommittees(data || []);
    }
  };

  const fetchCountries = async () => {
    const { data, error } = await supabase.from('countries').select('id, name');
    if (!error) {
      setCountries(data || []);
    }
  };

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password, fullName, role, committeeId, countryId);
    }

    setLoading(false);
  };

  // --- El JSX se actualiza con el nuevo fondo, efecto de cristal y animaciones ---
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-sky-100 via-white to-blue-100">
      <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Columna Izquierda: Información y Características */}
        <div className="hidden lg:block space-y-8 animate-[fade-in-up_1s_ease-out]">
          <div className="flex items-center space-x-3">
            <Logo size="xl" />
          </div>
          <div className="space-y-6">
            <div className="flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 hover:bg-white/60">
              <div className="flex-shrink-0 bg-white p-3 rounded-lg shadow-sm">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Plataforma Centralizada</h3>
                <p className="text-gray-600 mt-1 text-sm">Gestiona delegados, comités y resoluciones desde un único lugar.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 hover:bg-white/60">
              <div className="flex-shrink-0 bg-white p-3 rounded-lg shadow-sm">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Procesos Eficientes</h3>
                <p className="text-gray-600 mt-1 text-sm">Agiliza las votaciones y el flujo de trabajo para enfocarte en el debate.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 hover:bg-white/60">
              <div className="flex-shrink-0 bg-white p-3 rounded-lg shadow-sm">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Experiencia Intuitiva</h3>
                <p className="text-gray-600 mt-1 text-sm">Una interfaz fácil de usar tanto para organizadores como para delegados.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Formulario de Autenticación con efecto cristal */}
        <div className="w-full max-w-md mx-auto animate-[fade-in-up_1s_ease-out_0.2s]">
          <Card className="bg-white/60 backdrop-blur-xl shadow-2xl border border-white/70 transition-all duration-300 hover:shadow-blue-200/50 hover:-translate-y-1">
            <CardHeader className="text-left">
              <CardTitle className="text-2xl text-gray-900">{isLogin ? 'Iniciar Sesión' : 'Crear una Cuenta'}</CardTitle>
              <CardDescription className="text-gray-600">
                {isLogin
                  ? 'Bienvenido de nuevo. Ingresa tus credenciales.'
                  : 'Completa el formulario para unirte al sistema.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-gray-700">Nombre Completo</Label>
                      <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ingresa tu nombre completo" className="bg-white/70"/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-gray-700">Rol</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="bg-white/70"><SelectValue placeholder="Selecciona tu rol" /></SelectTrigger>
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
                    {role === 'delegate' && (
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-gray-700">País</Label>
                        <Select value={countryId} onValueChange={setCountryId} required>
                          <SelectTrigger className="bg-white/70"><SelectValue placeholder="Selecciona un país" /></SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {role === 'committee_secretary' && (
                      <div className="space-y-2">
                        <Label htmlFor="committee" className="text-gray-700">Comité</Label>
                        <Select value={committeeId} onValueChange={setCommitteeId} required>
                          <SelectTrigger className="bg-white/70"><SelectValue placeholder="Selecciona un comité" /></SelectTrigger>
                          <SelectContent>
                            {committees.map((committee) => (
                              <SelectItem key={committee.id} value={committee.id}>{committee.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Correo Electrónico</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="correo@ejemplo.com" className="bg-white/70"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="bg-white/70"/>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-300 hover:scale-105" disabled={loading}>
                  {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600">{isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}</span>
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-medium text-blue-600 hover:underline ml-1">
                  {isLogin ? 'Regístrate' : 'Inicia sesión'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


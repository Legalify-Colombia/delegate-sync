import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Vote, FileText, Star, Newspaper, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CommitteeTimer from '@/components/realtime/CommitteeTimer';
import VotingPanel from '@/components/realtime/VotingPanel';
import SpeakingQueue from '@/components/realtime/SpeakingQueue';
import DelegateNotes from '@/components/delegate/DelegateNotes';

interface Committee {
  id: string;
  name: string;
  topic: string;
  current_status: 'active' | 'paused' | 'voting';
}

interface Rating {
  score: number;
  comments: string;
  created_at: string;
}

export default function DelegateDashboard() {
  const { profile, signOut } = useAuth();
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryInfo, setCountryInfo] = useState<{ name: string; flag: string } | null>(null);

  useEffect(() => {
    if (profile?.committee_id) {
      fetchCommitteeData();
      fetchRatings();
      if (profile?.role === 'delegate' && profile.country_id) {
        fetchCountryInfo();
      }
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchCountryInfo = async () => {
    if (profile?.country_id) {
      try {
        const { data: country, error } = await supabase
          .from('countries')
          .select('name, flag')
          .eq('id', profile.country_id)
          .maybeSingle();
        
        if (country && !error) {
          setCountryInfo({
            name: country.name,
            flag: country.flag || '🏳️'
          });
        }
      } catch (err) {
        console.error('Error fetching country info:', err);
      }
    }
  };

  const fetchCommitteeData = async () => {
    if (!profile?.committee_id) return;

    const { data, error } = await supabase
      .from('committees')
      .select('*')
      .eq('id', profile.committee_id)
      .single();

    if (error) {
      console.error('Error fetching committee:', error);
    } else {
      setCommittee(data);
    }
    setLoading(false);
  };

  const fetchRatings = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('ratings')
      .select('score, comments, created_at')
      .eq('delegate_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
    } else {
      setRatings(data || []);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'voting': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Debate Activo';
      case 'voting': return 'Votación en Curso';
      case 'paused': return 'En Pausa';
      default: return 'Desconocido';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!committee) {
    return (
      <div className="min-h-screen bg-slate-100">
        {/* Custom Delegate Header for no committee state */}
        <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Logo size="md" />
              </div>
              <div className="flex items-center space-x-2">
                <Link to="/news">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <Newspaper className="h-4 w-4" />
                    <span className="hidden sm:inline">Noticias</span>
                  </Button>
                </Link>
                
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
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Sin Comité Asignado</h3>
            <p className="text-sm text-slate-500">
              Por favor contacta a un administrador para ser asignado a un comité.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length).toFixed(1)
    : 'N/A';

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Custom Delegate Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Logo size="md" />
                {countryInfo && (
                  <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1 rounded-full">
                    {countryInfo.flag ? (
                      <img 
                        src={countryInfo.flag} 
                        alt={`Bandera de ${countryInfo.name}`}
                        className="w-8 h-6 object-cover rounded border border-border"
                      />
                    ) : (
                      <span className="text-lg">🏳️</span>
                    )}
                    <div className="text-sm">
                      <div className="font-semibold text-foreground">{profile?.full_name}</div>
                      <div className="text-muted-foreground">{countryInfo.name}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Link to="/news">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <Newspaper className="h-4 w-4" />
                  <span className="hidden sm:inline">Noticias</span>
                </Button>
              </Link>
              
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
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* Committee Info */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2 text-slate-800">
                      <FileText className="h-5 w-5" />
                      <span>{committee.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-2 text-slate-600">{committee.topic}</CardDescription>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`${getStatusColor(committee.current_status)} text-white`}
                  >
                    {getStatusText(committee.current_status)}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Timer */}
            <Card className="bg-card shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-foreground text-base">
                  <Clock className="h-4 w-4" />
                  <span>Temporizador</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommitteeTimer committeeId={committee.id} />
              </CardContent>
            </Card>

            {/* Voting */}
            <Card className="bg-card shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-foreground text-base">
                  <Vote className="h-4 w-4" />
                  <span>Votación</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VotingPanel committeeId={committee.id} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Speaking Queue */}
            <Card className="bg-card shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-base">Intervenciones</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">Solicita tu turno</CardDescription>
              </CardHeader>
              <CardContent>
                <SpeakingQueue committeeId={committee.id} />
              </CardContent>
            </Card>

            {/* Delegate Notes */}
            <Card className="bg-card shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-base">Mis Notas</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">Notas privadas</CardDescription>
              </CardHeader>
              <CardContent>
                <DelegateNotes />
              </CardContent>
            </Card>
          </motion.div>

          {/* Ratings */}
          <motion.div variants={itemVariants}>
            <Card className="bg-card shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-foreground text-base">
                  <Star className="h-4 w-4" />
                  <span>Calificaciones</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Promedio: {averageRating} / 10
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ratings.length > 0 ? (
                  <div className="space-y-2">
                    {ratings.slice(0, 3).map((rating, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm">{rating.score}/10</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(rating.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {rating.comments && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rating.comments}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Aún no tienes calificaciones.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
import { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building, Activity, Newspaper, MessageSquare, Headphones, FileText, Loader2, Menu, X, LogOut, User, Settings, Bell } from 'lucide-react';

// Mock data and hooks for standalone demonstration
const useAuth = () => ({
    profile: { 
        role: 'staff',
        name: 'Juan Pérez',
        email: 'juan.perez@mun.org'
    },
    logout: () => {
        alert('Cerrando sesión...');
    }
});

const mockData = {
    committees: [
        { id: 'c1', name: 'Consejo de Seguridad', topic: 'Amenazas de Ciberseguridad Global', current_status: 'active' },
        { id: 'c2', name: 'OMS', topic: 'Tratado de Preparación para Pandemias', current_status: 'voting' },
        { id: 'c3', name: 'ECOSOC', topic: 'Financiación de ODS', current_status: 'paused' },
        { id: 'c4', name: 'Consejo de DDHH', topic: 'IA y Derechos Humanos', current_status: 'active' },
    ],
    announcements: [
        { id: 'a1', title: 'Horario de Ceremonia de Apertura', content: 'La ceremonia iniciará a las 9:00 AM en el auditorio principal.', created_at: new Date().toISOString() },
        { id: 'a2', title: 'Vouchers de Almuerzo Disponibles', content: 'Pueden recoger sus vouchers en el mostrador de registro.', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'a3', title: 'Reunión de Staff', content: 'Reunión obligatoria para todo el staff a las 3:00 PM.', created_at: new Date(Date.now() - 7200000).toISOString() },
    ]
};

const createMockQueryBuilder = (table: string) => {
    const createPromise = () => {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = mockData[table] || [];
                resolve({ data, error: null });
            }, 1500);
        });
    };

    const builder = {
        select: (columns: any) => builder,
        order: (column: any, options?: any) => builder,
        limit: (count: any) => builder,
        then: (callback: any) => createPromise().then(callback),
        catch: (callback: any) => createPromise().catch(callback)
    };

    return builder;
};

const supabase = {
    from: (table: string) => createMockQueryBuilder(table)
};

// Mock components
const StaffRequestManager = ({ isStaff }) => (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Gestor de Solicitudes</h3>
        <p className="text-sm text-blue-700 mb-3">Las solicitudes de los secretarios aparecerán aquí.</p>
        <div className="flex items-center justify-between text-sm">
            <span className="text-blue-600">Solicitudes pendientes:</span>
            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">3</span>
        </div>
    </div>
);

const NewsEditor = ({ showApprovalInterface }) => (
    <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
        <h3 className="font-semibold text-emerald-900 mb-2">Editor de Noticias</h3>
        <p className="text-sm text-emerald-700 mb-3">Crea y gestiona comunicados de prensa aquí.</p>
        <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-600">Artículos publicados:</span>
            <span className="bg-emerald-600 text-white px-2 py-1 rounded-full text-xs">7</span>
        </div>
    </div>
);

// Main Dashboard Component
export default function StaffDashboard() {
    const { profile, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('committees');
    const [committees, setCommittees] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsCount, setNotificationsCount] = useState(5);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [committeesResponse, announcementsResponse] = await Promise.all([
                    supabase.from('committees').select('*').order('name'),
                    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
                ]) as [any, any];

                if (committeesResponse.error) throw committeesResponse.error;
                if (announcementsResponse.error) throw announcementsResponse.error;

                setCommittees(committeesResponse.data || []);
                setAnnouncements(announcementsResponse.data || []);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError('Error al cargar los datos. Intenta nuevamente.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const chartData = useMemo(() => [
        { name: 'Activos', value: committees.filter(c => c.current_status === 'active').length },
        { name: 'Votando', value: committees.filter(c => c.current_status === 'voting').length },
        { name: 'En Pausa', value: committees.filter(c => c.current_status === 'paused').length },
    ], [committees]);

    if (loading) {
        return <SkeletonLoader />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center">
                    <div className="text-red-600 text-lg font-semibold mb-2">{error}</div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
            {/* Mobile Header */}
            <header className="bg-white shadow-lg border-b border-slate-200 sticky top-0 z-20">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">MUN</span>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-bold text-slate-800">Panel de Control</h1>
                                <p className="text-xs text-slate-500">MUN Staff Dashboard</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                            <Bell className="h-5 w-5 text-slate-600" />
                            {notificationsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {notificationsCount}
                                </span>
                            )}
                        </button>
                        <div className="flex items-center space-x-2 lg:hidden">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar for desktop / Mobile drawer */}
                <aside className={`
                    fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white shadow-xl border-r border-slate-200
                    transform transition-transform duration-300 ease-in-out lg:translate-x-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:block
                `}>
                    <div className="flex flex-col h-full">
                        {/* User Profile Section */}
                        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <User className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold truncate">{profile?.name}</p>
                                    <p className="text-xs text-indigo-100 truncate">{profile?.email}</p>
                                    <span className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-xs mt-1">
                                        {profile?.role === 'staff' ? 'Staff' : 'Prensa'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-4">
                            <TabNavigation 
                                activeTab={activeTab} 
                                setActiveTab={setActiveTab} 
                                profileRole={profile?.role}
                                setSidebarOpen={setSidebarOpen}
                            />
                        </nav>

                        {/* Logout Button */}
                        <div className="p-4 border-t border-slate-200">
                            <button
                                onClick={logout}
                                className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div 
                        className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 min-h-screen lg:ml-0">
                    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
                        {/* Welcome Section */}
                        <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                                        ¡Bienvenido, {profile?.name}!
                                    </h2>
                                    <p className="text-slate-600">
                                        {profile?.role === 'staff' ? 
                                            'Gestiona las operaciones del evento desde aquí' :
                                            'Crea y publica contenido de prensa'
                                        }
                                    </p>
                                </div>
                                <div className="mt-4 sm:mt-0">
                                    <div className="flex items-center space-x-4 text-sm text-slate-500">
                                        <span>Última actualización: {new Date().toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <TabContent 
                            activeTab={activeTab} 
                            committees={committees} 
                            announcements={announcements} 
                            chartData={chartData} 
                            profile={profile} 
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

// Sub-components
const TabNavigation = ({ activeTab, setActiveTab, profileRole, setSidebarOpen }) => {
    const tabs = [
        { id: 'committees', label: 'Comités', icon: Building },
        { id: 'activity', label: 'Actividad', icon: Activity },
        { id: 'announcements', label: 'Anuncios', icon: MessageSquare },
        { id: 'tools', label: 'Herramientas', icon: profileRole === 'staff' ? Headphones : Newspaper }
    ];

    return (
        <div className="space-y-1">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => {
                        setActiveTab(tab.id);
                        setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-left
                        ${activeTab === tab.id ? 
                            'bg-indigo-100 text-indigo-700 border-r-2 border-indigo-500' : 
                            'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                >
                    <tab.icon className="h-4 w-4" />
                    <span className="font-medium">{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

const TabContent = ({ activeTab, committees, announcements, chartData, profile }) => {
    const renderContent = () => {
        switch (activeTab) {
            case 'committees':
                return <CommitteeList committees={committees} />;
            case 'activity':
                return <ActivityView chartData={chartData} committees={committees} />;
            case 'announcements':
                return <AnnouncementList announcements={announcements} />;
            case 'tools':
                return <ToolsView profile={profile} />;
            default:
                return null;
        }
    };
    return <div>{renderContent()}</div>;
};

const CommitteeList = ({ committees }) => {
    const getStatusStyles = (status) => {
        switch (status) {
            case 'active': return { 
                border: 'border-l-green-500', 
                bg: 'bg-green-50 border-green-200', 
                badge: 'bg-green-100 text-green-800',
                dot: 'bg-green-500'
            };
            case 'voting': return { 
                border: 'border-l-blue-500', 
                bg: 'bg-blue-50 border-blue-200', 
                badge: 'bg-blue-100 text-blue-800',
                dot: 'bg-blue-500'
            };
            case 'paused': return { 
                border: 'border-l-yellow-500', 
                bg: 'bg-yellow-50 border-yellow-200', 
                badge: 'bg-yellow-100 text-yellow-800',
                dot: 'bg-yellow-500'
            };
            default: return { 
                border: 'border-l-slate-400', 
                bg: 'bg-slate-50 border-slate-200', 
                badge: 'bg-slate-100 text-slate-800',
                dot: 'bg-slate-500'
            };
        }
    };
    
    const getStatusText = (status) => ({ 
        active: 'Debate Activo', 
        voting: 'En Votación', 
        paused: 'En Pausa' 
    }[status] || 'Desconocido');

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Estado de los Comités</h3>
            <div className="grid gap-4">
                {committees.length > 0 ? committees.map(c => {
                    const styles = getStatusStyles(c.current_status);
                    return (
                        <div key={c.id} className={`p-4 bg-white rounded-xl border-l-4 ${styles.border} ${styles.bg} border shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="font-semibold text-slate-800 truncate">{c.name}</h4>
                                        <div className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`}></div>
                                    </div>
                                    <p className="text-sm text-slate-600">{c.topic}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-3 ${styles.badge}`}>
                                    {getStatusText(c.current_status)}
                                </span>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No se encontraron comités.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ActivityView = ({ chartData, committees }) => {
    const COLORS = { 'Activos': '#22c55e', 'Votando': '#3b82f6', 'En Pausa': '#eab308' };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Actividad del Evento</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="font-semibold text-slate-700 mb-4">Distribución de Estados</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={chartData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stats */}
                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-4">Estadísticas Generales</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="text-slate-600 font-medium">Total de Comités:</span>
                                <span className="font-bold text-slate-800 text-lg">{committees.length}</span>
                            </div>
                            {chartData.map(item => (
                                <div key={item.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[item.name] }}></div>
                                        <span className="text-slate-600 font-medium">{item.name}:</span>
                                    </div>
                                    <span className="font-bold text-slate-800 text-lg">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                        <h4 className="font-semibold text-indigo-900 mb-2">Estado del Sistema</h4>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-indigo-700">Todos los sistemas operativos</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AnnouncementList = ({ announcements }) => (
    <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800">Anuncios Recientes</h3>
        <div className="space-y-4">
            {announcements.length > 0 ? announcements.map((a, index) => (
                <div key={a.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-slate-800 flex-1">{a.title}</h4>
                        <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                            {new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString()}
                        </span>
                    </div>
                    <p className="text-slate-600 mb-3">{a.content}</p>
                    <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            index === 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {index === 0 ? 'Nuevo' : 'Publicado'}
                        </span>
                    </div>
                </div>
            )) : (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No hay anuncios recientes.</p>
                </div>
            )}
        </div>
    </div>
);

const ToolsView = ({ profile }) => (
    <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800">Herramientas de Gestión</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {profile?.role === 'staff' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <StaffRequestManager isStaff={true} />
                </div>
            )}
            
            {profile?.role === 'press' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <NewsEditor showApprovalInterface={false} />
                </div>
            )}
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-600" />
                    Documentos y Recursos
                </h4>
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg text-center border border-slate-200">
                    <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Sistema de documentos próximamente...</p>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-slate-600" />
                    Configuración
                </h4>
                <div className="space-y-3">
                    <button className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">
                        <span className="text-sm font-medium text-slate-700">Preferencias de Notificación</span>
                        <p className="text-xs text-slate-500">Configura cómo recibir alertas</p>
                    </button>
                    <button className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">
                        <span className="text-sm font-medium text-slate-700">Cambiar Contraseña</span>
                        <p className="text-xs text-slate-500">Actualiza tu contraseña de acceso</p>
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const SkeletonLoader = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white shadow-lg border-b border-slate-200">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                    <div className="hidden sm:block space-y-1">
                        <div className="h-4 bg-slate-200 rounded w-32 animate-pulse"></div>
                        <div className="h-3 bg-slate-200 rounded w-24 animate-pulse"></div>
                    </div>
                </div>
                <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse"></div>
            </div>
        </header>
        <div className="flex">
            <aside className="hidden lg:block w-64 bg-white shadow-xl border-r border-slate-200 h-screen">
                <div className="p-4 space-y-4">
                    <div className="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
                    <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                        ))}
                    </div>
                </div>
            </aside>
            <main className="flex-1 p-6">
                <div className="space-y-6">
                    <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-64 bg-white rounded-xl shadow-sm border border-slate-200 animate-pulse"></div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-center mt-12">
                    <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                </div>
            </main>
        </div>
    </div>
);
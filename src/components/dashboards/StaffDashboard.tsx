import { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building, Activity, Newspaper, MessageSquare, Headphones, FileText, Loader2, ArrowUpRight } from 'lucide-react';
// Para las animaciones, necesitarás instalar framer-motion: npm install framer-motion
import { motion, AnimatePresence, useSpring, useTransform, animate } from 'framer-motion';

// --- Mocks para demostración (igual que antes) ---
const useAuth = () => ({ profile: { role: 'staff' } });
const StaffRequestManager = ({ isStaff }: { isStaff: boolean }) => (<div className="p-4 bg-slate-100 rounded-lg text-center"><h3 className="font-semibold">Staff Request Manager</h3><p className="text-sm text-slate-600">(Aquí iría tu componente real)</p></div>);
const NewsEditor = ({ showApprovalInterface }: { showApprovalInterface: boolean }) => (<div className="p-4 bg-slate-100 rounded-lg text-center"><h3 className="font-semibold">News Editor</h3><p className="text-sm text-slate-600">(Aquí iría tu componente real)</p></div>);
const createSupabaseQueryBuilder = (tableName: string) => ({
    _table: tableName, order(column?: string, options?: { ascending?: boolean }) { return this; }, limit(count?: number) { return this; }, select(columns?: string) { return this; },
    async then(resolve: (value: any) => void) {
        await new Promise(res => setTimeout(res, 1200));
        if (this._table === 'committees') {
            resolve({ data: [{ id: 'c1', name: 'Security Council', topic: 'Global Cybersecurity Threats', current_status: 'active' }, { id: 'c2', name: 'WHO', topic: 'Pandemic Preparedness Treaty', current_status: 'voting' }, { id: 'c3', name: 'ECOSOC', topic: 'Sustainable Development Goal Financing', current_status: 'paused' }, { id: 'c4', name: 'Human Rights Council', topic: 'AI and Human Rights', current_status: 'active' }], error: null });
        } else if (this._table === 'announcements') {
            resolve({ data: [{ id: 'a1', title: 'Opening Ceremony Schedule', content: 'The ceremony will begin at 9 AM sharp in the main hall.', created_at: new Date().toISOString() }, { id: 'a2', title: 'Lunch Vouchers Available', content: 'Please collect your lunch vouchers from the registration desk.', created_at: new Date(Date.now() - 3600000).toISOString() }], error: null });
        } else { resolve({ data: [], error: null }); }
    }
});
const supabase = { from: (table: string) => createSupabaseQueryBuilder(table) };

// --- Interfaces ---
interface Committee { id: string; name: string; topic: string; current_status: 'active' | 'paused' | 'voting'; }
interface Announcement { id: string; title: string; content: string; created_at: string; }

// --- Componente para animar números ---
function AnimatedStat({ value }: { value: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const controls = animate(displayValue, value, {
            duration: 1.5,
            ease: "easeOut",
            onUpdate(latest) {
                setDisplayValue(latest);
            }
        });
        return () => controls.stop();
    }, [value]);
    
    return <span className="font-bold text-slate-800 text-2xl">{Math.round(displayValue)}</span>
}


// --- Componente Principal del Dashboard ---
export default function StaffDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('committees');
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); setError(null);
            try {
                const [committeesResponse, announcementsResponse] = await Promise.all([
                    supabase.from('committees').select('*').order('name'),
                    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
                ]);
                if (committeesResponse.error) throw committeesResponse.error;
                if (announcementsResponse.error) throw announcementsResponse.error;
                setCommittees(committeesResponse.data || []);
                setAnnouncements(announcementsResponse.data || []);
            } catch (err: any) {
                console.error("Error fetching data:", err);
                setError('Failed to load dashboard data.');
            } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const chartData = useMemo(() => [
        { name: 'Active', value: committees.filter(c => c.current_status === 'active').length },
        { name: 'Voting', value: committees.filter(c => c.current_status === 'voting').length },
        { name: 'Paused', value: committees.filter(c => c.current_status === 'paused').length },
    ], [committees]);

    if (loading) return <SkeletonLoader />;
    if (error) return <div className="flex items-center justify-center h-screen bg-slate-50 text-red-600">{error}</div>;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
             <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-2xl font-bold text-slate-800">Panel de Control: Staff & Prensa</h1>
                    <p className="text-sm text-slate-500">Vista dinámica del estado y herramientas del evento.</p>
                </div>
            </header>

            <motion.main 
                className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Columna Izquierda - Resumen de Actividad */}
                <motion.div className="lg:col-span-1 space-y-6" variants={itemVariants}>
                    <ActivityView chartData={chartData} committees={committees} />
                </motion.div>

                {/* Columna Derecha - Contenido Principal con Pestañas */}
                <motion.div className="lg:col-span-2 space-y-6" variants={itemVariants}>
                    <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} profileRole={profile?.role} />
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TabContent activeTab={activeTab} committees={committees} announcements={announcements} profile={profile} />
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </motion.main>
        </div>
    );
}

// --- Sub-componentes Refinados ---

const TabNavigation = ({ activeTab, setActiveTab, profileRole }: { activeTab: string, setActiveTab: (tab: string) => void, profileRole?: string }) => {
    const tabs = [
        { id: 'committees', label: 'Comités', icon: Building },
        { id: 'announcements', label: 'Anuncios', icon: MessageSquare },
        { id: 'tools', label: 'Herramientas', icon: profileRole === 'staff' ? Headphones : Newspaper }
    ];

    return (
        <div className="bg-white p-1 rounded-xl shadow-md flex items-center justify-around space-x-1">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-colors duration-300 ease-in-out flex items-center justify-center gap-2
                        ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    {activeTab === tab.id && (
                        <motion.div layoutId="active-pill" className="absolute inset-0 bg-indigo-100 rounded-lg z-0" />
                    )}
                    <tab.icon className="h-5 w-5 z-10" />
                    <span className="hidden sm:inline z-10">{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

const TabContent = ({ activeTab, committees, announcements, profile }: { activeTab: string, committees: Committee[], announcements: Announcement[], profile: any }) => {
    const renderContent = () => {
        switch (activeTab) {
            case 'committees': return <CommitteeList committees={committees} />;
            case 'announcements': return <AnnouncementList announcements={announcements} />;
            case 'tools': return <ToolsView profile={profile} />;
            default: return null;
        }
    };
    return <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">{renderContent()}</div>
};

const CommitteeList = ({ committees }: { committees: Committee[] }) => {
    const getStatusStyles = (status: Committee['current_status']) => ({
        active: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800' },
        voting: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' },
        paused: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-800' },
    }[status] || { border: 'border-slate-400', bg: 'bg-slate-100', text: 'text-slate-800' });
    const getStatusText = (status: Committee['current_status']) => ({ active: 'Debate Activo', voting: 'Votación', paused: 'En Pausa' }[status] || 'Desconocido');

    return (
        <div className="space-y-3">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Estado de Comités</h3>
            {committees.length > 0 ? committees.map((c, i) => {
                const styles = getStatusStyles(c.current_status);
                return (
                    <motion.div
                        key={c.id}
                        className={`p-4 bg-white rounded-lg border-l-4 ${styles.border} flex items-center justify-between shadow-sm transition-shadow hover:shadow-lg`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <div>
                            <p className="font-semibold text-slate-800">{c.name}</p>
                            <p className="text-sm text-slate-500">{c.topic}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles.bg} ${styles.text}`}>
                            {getStatusText(c.current_status)}
                        </span>
                    </motion.div>
                );
            }) : <p className="text-slate-500 text-center py-4">No se encontraron comités.</p>}
        </div>
    );
};

const ActivityView = ({ chartData, committees }: { chartData: any[], committees: Committee[] }) => {
    const COLORS = { 'Active': '#22c55e', 'Voting': '#3b82f6', 'Paused': '#f59e0b' };
    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md space-y-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Activity size={22}/> Resumen de Actividad</h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} cornerRadius={5}>
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name]} className="focus:outline-none" />)}
                        </Pie>
                        <Tooltip /> <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-500">Total</p>
                    <AnimatedStat value={committees.length} />
                </div>
                 {chartData.map(item => (
                    <div key={item.name} className="p-3 bg-slate-50 rounded-lg">
                       <p className="text-sm font-medium text-slate-500">{item.name}</p>
                       <AnimatedStat value={item.value} />
                   </div>
                ))}
            </div>
        </div>
    );
};

const AnnouncementList = ({ announcements }: { announcements: Announcement[] }) => (
    <div className="space-y-4">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Anuncios Recientes</h3>
        {announcements.length > 0 ? announcements.map(a => (
            <motion.div key={a.id} className="border-b border-slate-200 pb-3 last:border-b-0" whileHover={{ x: 5 }}>
                <p className="font-semibold text-slate-800">{a.title}</p>
                <p className="text-sm text-slate-600 my-1">{a.content}</p>
                <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
            </motion.div>
        )) : <p className="text-slate-500 text-center py-4">No hay anuncios recientes.</p>}
    </div>
);

const ToolsView = ({ profile }: { profile: any }) => (
    <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4">Herramientas de Gestión</h3>
        {profile?.role === 'staff' && <StaffRequestManager isStaff={true} />}
        {profile?.role === 'press' && <NewsEditor showApprovalInterface={false} />}
        <div className="mt-6">
             <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><FileText size={18}/> Documentos y Recursos</h4>
             <div className="p-4 bg-slate-100 rounded-lg text-center"><p className="text-sm text-slate-600">Sistema de documentos próximamente...</p></div>
        </div>
    </div>
);

const SkeletonLoader = () => (
    <div className="min-h-screen bg-slate-100">
         <header className="bg-white/80"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"><div className="h-7 bg-slate-200 rounded w-1/2 mb-2 animate-pulse"></div><div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse"></div></div></header>
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-80 bg-white rounded-xl animate-pulse"></div>
            <div className="lg:col-span-2 space-y-6"><div className="h-16 bg-white rounded-xl animate-pulse"></div><div className="h-96 bg-white rounded-xl animate-pulse"></div></div>
        </main>
    </div>
);


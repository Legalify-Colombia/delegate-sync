import { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building, Activity, Newspaper, MessageSquare, Headphones, FileText, Loader2 } from 'lucide-react';

// Mock data and hooks for standalone demonstration
// In a real app, these would be imported
const useAuth = () => ({
    profile: { role: 'staff' } // Can be 'staff', 'press', or other
});

const supabase = {
    from: (table) => ({
        select: async (columns) => {
            await new Promise(res => setTimeout(res, 1500)); // Simulate network delay
            if (table === 'committees') {
                return {
                    data: [
                        { id: 'c1', name: 'Security Council', topic: 'Global Cybersecurity Threats', current_status: 'active' },
                        { id: 'c2', name: 'WHO', topic: 'Pandemic Preparedness Treaty', current_status: 'voting' },
                        { id: 'c3', name: 'ECOSOC', topic: 'Sustainable Development Goal Financing', current_status: 'paused' },
                        { id: 'c4', name: 'Human Rights Council', topic: 'AI and Human Rights', current_status: 'active' },
                    ],
                    error: null
                };
            }
            if (table === 'announcements') {
                return {
                    data: [
                        { id: 'a1', title: 'Opening Ceremony Schedule', content: 'The ceremony will begin at 9 AM sharp in the main hall.', created_at: new Date().toISOString() },
                        { id: 'a2', title: 'Lunch Vouchers Available', content: 'Please collect your lunch vouchers from the registration desk.', created_at: new Date(Date.now() - 3600000).toISOString() },
                    ],
                    error: null
                }
            }
            return { data: [], error: null };
        },
        order: () => supabase.from(table),
        limit: () => supabase.from(table),
    })
};

// Mock components for demonstration
const StaffRequestManager = ({ isStaff }) => <div className="p-4 bg-slate-100 rounded-lg text-center"><h3 className="font-semibold">Staff Request Manager</h3><p className="text-sm text-slate-600">Requests from secretaries will appear here.</p></div>;
const NewsEditor = ({ showApprovalInterface }) => <div className="p-4 bg-slate-100 rounded-lg text-center"><h3 className="font-semibold">News Editor</h3><p className="text-sm text-slate-600">Create and manage press releases here.</p></div>;


// Main Dashboard Component
export default function StaffDashboard() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState('committees');
    const [committees, setCommittees] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [committeesResponse, announcementsResponse] = await Promise.all([
                    supabase.from('committees').select('*').order('name'),
                    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
                ]);

                if (committeesResponse.error) throw committeesResponse.error;
                if (announcementsResponse.error) throw announcementsResponse.error;

                setCommittees(committeesResponse.data || []);
                setAnnouncements(announcementsResponse.data || []);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError('Failed to load dashboard data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Here you would also set up your Supabase real-time subscriptions
    }, []);

    const chartData = useMemo(() => [
        { name: 'Active', value: committees.filter(c => c.current_status === 'active').length },
        { name: 'Voting', value: committees.filter(c => c.current_status === 'voting').length },
        { name: 'Paused', value: committees.filter(c => c.current_status === 'paused').length },
    ], [committees]);

    if (loading) {
        return <SkeletonLoader />;
    }

    if (error) {
        return <div className="flex items-center justify-center h-screen bg-slate-50 text-red-600">{error}</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-slate-800">Staff & Press Dashboard</h1>
                    <p className="text-sm text-slate-500">Event status and management tools at a glance.</p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4">
                <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} profileRole={profile?.role} />
                <div className="mt-4">
                    <TabContent activeTab={activeTab} committees={committees} announcements={announcements} chartData={chartData} profile={profile} />
                </div>
            </main>
        </div>
    );
}

// Sub-components for better organization

const TabNavigation = ({ activeTab, setActiveTab, profileRole }) => {
    const tabs = [
        { id: 'committees', label: 'Committees', icon: Building },
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'announcements', label: 'Announcements', icon: MessageSquare },
        { id: 'tools', label: 'Tools', icon: profileRole === 'staff' ? Headphones : Newspaper }
    ];

    return (
        <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-around space-x-1">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2.5 px-2 text-sm font-medium rounded-md transition-colors duration-200 ease-in-out flex flex-col sm:flex-row items-center justify-center gap-2
                        ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <tab.icon className="h-5 w-5" />
                    <span className="hidden sm:inline">{tab.label}</span>
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
    return <div className="bg-white p-4 rounded-lg shadow-sm">{renderContent()}</div>
};

const CommitteeList = ({ committees }) => {
    const getStatusStyles = (status) => {
        switch (status) {
            case 'active': return { border: 'border-green-500', bg: 'bg-green-100', text: 'text-green-800' };
            case 'voting': return { border: 'border-blue-500', bg: 'bg-blue-100', text: 'text-blue-800' };
            case 'paused': return { border: 'border-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-800' };
            default: return { border: 'border-slate-400', bg: 'bg-slate-100', text: 'text-slate-800' };
        }
    };
    const getStatusText = (status) => ({ active: 'Active Debate', voting: 'Voting', paused: 'Paused' }[status] || 'Unknown');

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Committee Status</h3>
            {committees.length > 0 ? committees.map(c => {
                const styles = getStatusStyles(c.current_status);
                return (
                    <div key={c.id} className={`p-3 bg-white rounded-lg border-l-4 ${styles.border} flex items-center justify-between shadow-sm`}>
                        <div>
                            <p className="font-semibold text-slate-800">{c.name}</p>
                            <p className="text-sm text-slate-500">{c.topic}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${styles.bg} ${styles.text}`}>
                            {getStatusText(c.current_status)}
                        </span>
                    </div>
                );
            }) : <p className="text-slate-500 text-center py-4">No committees found.</p>}
        </div>
    );
};

const ActivityView = ({ chartData, committees }) => {
    const COLORS = { 'Active': '#22c55e', 'Voting': '#3b82f6', 'Paused': '#eab308' };

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Event Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                        <span className="text-slate-600">Total Committees:</span>
                        <span className="font-bold text-slate-800">{committees.length}</span>
                    </div>
                    {chartData.map(item => (
                         <div key={item.name} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <span className="text-slate-600">{item.name}:</span>
                            <span className="font-bold text-slate-800">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AnnouncementList = ({ announcements }) => (
    <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Recent Announcements</h3>
        {announcements.length > 0 ? announcements.map(a => (
            <div key={a.id} className="border-b border-slate-200 pb-3 last:border-b-0">
                <p className="font-semibold text-slate-800">{a.title}</p>
                <p className="text-sm text-slate-600 my-1">{a.content}</p>
                <p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
            </div>
        )) : <p className="text-slate-500 text-center py-4">No recent announcements.</p>}
    </div>
);

const ToolsView = ({ profile }) => (
    <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Management Tools</h3>
        {profile?.role === 'staff' && <StaffRequestManager isStaff={true} />}
        {profile?.role === 'press' && <NewsEditor showApprovalInterface={false} />}
        
        <div className="mt-6">
             <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><FileText size={18}/> Documents & Resources</h4>
             <div className="p-4 bg-slate-100 rounded-lg text-center">
                <p className="text-sm text-slate-600">Document system coming soon...</p>
             </div>
        </div>
    </div>
);


const SkeletonLoader = () => (
    <div className="min-h-screen bg-slate-50">
         <header className="bg-white shadow-sm">
            <div className="max-w-4xl mx-auto px-4 py-4">
                <div className="h-7 bg-slate-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
            </div>
        </header>
        <main className="max-w-4xl mx-auto p-4">
            <div className="h-14 bg-white rounded-lg shadow-sm animate-pulse"></div>
            <div className="mt-4 h-96 bg-white rounded-lg shadow-sm animate-pulse flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
            </div>
        </main>
    </div>
);

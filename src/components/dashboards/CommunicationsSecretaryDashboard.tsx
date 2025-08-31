import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Componentes UI y Layout de tu proyecto
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NewsEditor from '@/components/press/NewsEditor';
import { ImageUpload } from '@/components/ui/image-upload';

// Iconos
import { MessageSquare, FileText, PlusCircle, Newspaper, X, CheckCircle, XCircle, Edit } from 'lucide-react';

// Interfaces
interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}
interface NewsPublication {
    id: string;
    title: string;
    content: string;
    created_at: string;
    status: 'submitted_for_review' | 'approved' | 'rejected';
    author: { full_name: string };
    committees?: { name: string };
}
interface Committee {
    id: string;
    name: string;
}

// --- Modales ---
const CreateAnnouncementModal = ({ onClose, createAnnouncement, title, setTitle, content, setContent, loading }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b"><h3 className="text-lg font-semibold text-gray-900">Crear Nuevo Anuncio</h3><p className="text-sm text-gray-500">Este anuncio será visible para todos los participantes.</p></div>
            <div className="p-6 space-y-4">
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Título</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del anuncio" /></div>
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Contenido</label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escribe el contenido del anuncio aquí..." rows={5} /></div>
            </div>
            <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={createAnnouncement} disabled={loading || !title.trim() || !content.trim()}>{loading ? 'Publicando...' : 'Publicar Anuncio'}</Button>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X /></button>
        </motion.div>
    </motion.div>
);

const CreateNewsModal = ({ onClose, createNews, newsData, setNewsData, committees, loading }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b"><h3 className="text-lg font-semibold text-gray-900">Crear Noticia</h3><p className="text-sm text-gray-500">Redacta una nueva publicación para la sección de noticias.</p></div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Título</label><Input value={newsData.title} onChange={(e) => setNewsData({...newsData, title: e.target.value})} placeholder="Titular de la noticia" /></div>
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Comité (Opcional)</label>
                    <Select onValueChange={(value) => setNewsData({...newsData, committee_id: value})} value={newsData.committee_id}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar comité..." /></SelectTrigger>
                        <SelectContent>
                                <SelectItem value="none">Ninguno</SelectItem>
                            {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <ImageUpload
                  label="Imagen de Portada (Opcional)"
                  onImageUploaded={(url) => setNewsData({...newsData, cover_image_url: url})}
                  currentImage={newsData.cover_image_url}
                  className="mb-4"
                />
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Contenido</label><Textarea value={newsData.content} onChange={(e) => setNewsData({...newsData, content: e.target.value})} placeholder="Escribe el cuerpo de la noticia aquí..." rows={8} /></div>
            </div>
            <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={createNews} disabled={loading || !newsData.title.trim() || !newsData.content.trim()}>{loading ? 'Enviando a revisión...' : 'Enviar Noticia'}</Button>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X /></button>
        </motion.div>
    </motion.div>
);

const NewsManagementModal = ({ onClose }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] relative flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b"><h3 className="text-lg font-semibold text-gray-900">Gestión de Noticias</h3><p className="text-sm text-gray-500">Aprueba, rechaza y edita las publicaciones de prensa.</p></div>
            <div className="p-6 flex-grow overflow-y-auto">
                {/* NewsEditor ahora vive dentro del modal, gestionando su propia data */}
                <NewsEditor showApprovalInterface={true} />
            </div>
            <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 hover:text-gray-700"><X /></button>
        </motion.div>
    </motion.div>
);


// Componente principal del Dashboard
export default function CommunicationsSecretaryDashboard() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [news, setNews] = useState<NewsPublication[]>([]);
    const [committees, setCommittees] = useState<Committee[]>([]);
    
    // Estados para el modal de anuncios
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    
    // Estados para el modal de crear noticias
    const [newsData, setNewsData] = useState({ title: '', content: '', cover_image_url: '', committee_id: '' });

    const [loading, setLoading] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('announcements');

    useEffect(() => {
        fetchAnnouncements();
        fetchNews();
        fetchCommittees();
    }, []);

    const fetchAnnouncements = async () => {
        const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (!error) setAnnouncements(data || []);
    };
    
    const fetchNews = async () => {
        const { data, error } = await supabase.from('news_publications').select('*, author:profiles(full_name), committees(name)').order('created_at', { ascending: false });
        if (!error) setNews(data as any || []);
    };
    
    const fetchCommittees = async () => {
        const { data, error } = await supabase.from('committees').select('id, name');
        if (!error) setCommittees(data || []);
    };

    const createAnnouncement = async () => {
        if (!profile || !announcementTitle.trim() || !announcementContent.trim()) return;
        setLoading(true);
        const { error } = await supabase.from('announcements').insert({ title: announcementTitle.trim(), content: announcementContent.trim(), author_id: profile.id });
        if (error) { toast({ title: "Error", description: "No se pudo crear el anuncio", variant: "destructive" }); } 
        else {
            toast({ title: "Éxito", description: "Anuncio creado correctamente" });
            setAnnouncementTitle('');
            setAnnouncementContent('');
            await fetchAnnouncements();
            setActiveModal(null);
        }
        setLoading(false);
    };

    const createNews = async () => {
        if (!profile || !newsData.title.trim() || !newsData.content.trim()) return;
        setLoading(true);
        // Si el usuario es communications_secretary, la noticia se publica automáticamente
        const isCommSecretary = profile.role === 'communications_secretary';
        const { error } = await supabase.from('news_publications').insert({
            title: newsData.title.trim(),
            content: newsData.content.trim(),
            cover_image_url: newsData.cover_image_url.trim() || null,
            committee_id: newsData.committee_id || null,
            author_id: profile.id,
            status: isCommSecretary ? 'approved' : 'submitted_for_review'
        });
        if (error) { toast({ title: "Error", description: "No se pudo crear la noticia", variant: "destructive" }); }
        else {
            toast({ title: "Éxito", description: isCommSecretary ? "Noticia publicada y visible." : "Noticia enviada para revisión." });
            setNewsData({ title: '', content: '', cover_image_url: '', committee_id: '' });
            await fetchNews();
            setActiveModal(null);
        }
        setLoading(false);
    };

    const approvedNews = news.filter(n => n.status === 'approved');

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardHeader />
            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Panel de Comunicaciones</h2>
                    <p className="text-gray-600">Gestiona las comunicaciones y publicaciones del evento.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <ActionCard icon={<PlusCircle className="h-8 w-8 text-blue-600" />} title="Crear Anuncio" description="Publica un nuevo anuncio general." onClick={() => setActiveModal('createAnnouncement')} />
                    <ActionCard icon={<Newspaper className="h-8 w-8 text-blue-600" />} title="Crear Noticia" description="Redacta una nueva publicación de prensa." onClick={() => setActiveModal('createNews')} />
                    <ActionCard icon={<FileText className="h-8 w-8 text-blue-600" />} title="Gestionar Noticias" description="Aprueba y edita las publicaciones existentes." onClick={() => setActiveModal('manageNews')} />
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="p-4 border-b">
                        <div className="flex space-x-4">
                            <TabButton title="Anuncios Recientes" isActive={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} icon={<MessageSquare size={16}/>} />
                            <TabButton title="Noticias Aprobadas" isActive={activeTab === 'news'} onClick={() => setActiveTab('news')} icon={<Newspaper size={16}/>} />
                        </div>
                    </div>
                    <div className="p-6">
                        {activeTab === 'announcements' && (
                            <div className="space-y-4">
                                {announcements.length > 0 ? (
                                    announcements.slice(0, 5).map((announcement) => (
                                        <div key={announcement.id} className="p-4 border-l-4 border-blue-500 bg-blue-50/50 rounded-r-lg">
                                            <h4 className="font-semibold text-gray-800">{announcement.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
                                            <p className="text-xs text-gray-400 mt-2">{new Date(announcement.created_at).toLocaleString('es-ES')}</p>
                                        </div>
                                    ))
                                ) : (<p className="text-gray-500 text-center py-8">No hay anuncios publicados.</p>)}
                            </div>
                        )}
                        {activeTab === 'news' && (
                             <div className="space-y-4">
                                {approvedNews.length > 0 ? (
                                    approvedNews.slice(0, 5).map((article) => (
                                        <div key={article.id} className="p-4 border-l-4 border-green-500 bg-green-50/50 rounded-r-lg">
                                            <h4 className="font-semibold text-gray-800">{article.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1">Por: {article.author.full_name} | Comité: {article.committees?.name || 'General'}</p>
                                            <p className="text-xs text-gray-400 mt-2">{new Date(article.created_at).toLocaleString('es-ES')}</p>
                                            <button
                                                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                                onClick={() => window.location.href = `/news/${article.id}`}
                                            >
                                                Ir a la noticia
                                            </button>
                                        </div>
                                    ))
                                ) : (<p className="text-gray-500 text-center py-8">No hay noticias aprobadas.</p>)}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <AnimatePresence>
                {activeModal === 'createAnnouncement' && <CreateAnnouncementModal onClose={() => setActiveModal(null)} createAnnouncement={createAnnouncement} title={announcementTitle} setTitle={setAnnouncementTitle} content={announcementContent} setContent={setAnnouncementContent} loading={loading} />}
                {activeModal === 'createNews' && <CreateNewsModal onClose={() => setActiveModal(null)} createNews={createNews} newsData={newsData} setNewsData={setNewsData} committees={committees} loading={loading} />}
                {activeModal === 'manageNews' && <NewsManagementModal onClose={() => setActiveModal(null)} />}
            </AnimatePresence>
        </div>
    );
}

const ActionCard = ({ icon, title, description, onClick }) => (
    <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col" onClick={onClick}>
        <div className="mb-4">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-4 flex-grow">{description}</p>
        <span className="text-sm font-semibold text-blue-600">Acceder</span>
    </div>
);

const TabButton = ({ title, isActive, onClick, icon }) => (
    <button onClick={onClick} className={`flex items-center space-x-2 px-3 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
        {icon}
        <span>{title}</span>
    </button>
);

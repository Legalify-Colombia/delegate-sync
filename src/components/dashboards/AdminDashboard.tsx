import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building, Settings, Activity, Globe } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import CommitteeManagement from '@/components/admin/CommitteeManagement';
import CountryManagement from '@/components/admin/CountryManagement';
import SystemOverview from '@/components/admin/SystemOverview';
import ModelManagement from '@/components/admin/ModelManagement';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Panel de Administración</h2>
          <p className="text-sm text-slate-500">Gestiona usuarios, comités y controla el sistema MUN</p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <motion.div variants={itemVariants}>
              <div className="bg-white p-1 rounded-xl shadow-md flex items-center justify-around space-x-1">
                {[
                  { id: 'overview', label: 'Resumen', icon: Activity },
                  { id: 'models', label: 'Modelos', icon: Building },
                  { id: 'users', label: 'Usuarios', icon: Users },
                  { id: 'committees', label: 'Comités', icon: Building },
                  { id: 'countries', label: 'Países', icon: Globe },
                  { id: 'settings', label: 'Configuración', icon: Settings }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-colors duration-300 ease-in-out flex items-center justify-center gap-2 ${
                      activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {activeTab === tab.id && (
                      <motion.div layoutId="active-pill" className="absolute inset-0 bg-primary/10 rounded-lg z-0" />
                    )}
                    <tab.icon className="h-5 w-5 z-10" />
                    <span className="hidden sm:inline z-10">{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white p-4 sm:p-6 rounded-xl shadow-md"
              >
                {activeTab === 'overview' && <SystemOverview />}
                {activeTab === 'models' && <ModelManagement />}
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'committees' && <CommitteeManagement />}
                {activeTab === 'countries' && <CountryManagement />}
                {activeTab === 'settings' && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Configuración del Sistema</h3>
                    <p className="text-slate-500">Configuraciones adicionales próximamente...</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
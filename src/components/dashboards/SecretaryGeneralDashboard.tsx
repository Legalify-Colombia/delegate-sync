import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, MessageSquare, Building } from 'lucide-react';
import SystemOverview from '@/components/admin/SystemOverview';

export default function SecretaryGeneralDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">Panel del Secretario General</h2>
          <p className="text-muted-foreground">Supervisa el funcionamiento global del evento MUN</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Resumen General</span>
            </TabsTrigger>
            <TabsTrigger value="committees" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Comités</span>
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Comunicaciones</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <SystemOverview />
          </TabsContent>

          <TabsContent value="committees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado de los Comités</CardTitle>
                <CardDescription>Supervisa el estado de todos los comités</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Vista de comités próximamente...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Anuncios Generales</CardTitle>
                <CardDescription>Envía comunicados a todos los participantes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Sistema de anuncios próximamente...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
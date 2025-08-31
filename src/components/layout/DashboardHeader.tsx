import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { Logo } from '@/components/ui/logo';

interface DashboardHeaderProps {
  eventName?: string;
}

export function DashboardHeader({ eventName }: DashboardHeaderProps) {
  const { profile, signOut } = useAuth();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();

  if (!profile) return null;

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo size="md" />
            {eventName && (
              <span className="ml-3 font-medium text-muted-foreground hidden sm:block">{eventName}</span>
            )}
          </div>

          {/* Notifications and Profile */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Popover open={isNotificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notificaciones</CardTitle>
                    <CardDescription>
                      {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {notifications.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-border last:border-b-0 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-muted/50' : 'hover:bg-muted/30'
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium">{notification.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <Badge variant="secondary" className="ml-2 h-2 w-2 p-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        No tienes notificaciones
                      </div>
                    )}
                  </CardContent>
                </Card>
              </PopoverContent>
            </Popover>

            {/* Profile Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border-2 border-transparent hover:border-primary/20 transition-all">
                  <User size={18} className="text-primary" />
                </div>
              </Button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 origin-top-right z-50"
                  >
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-border">
                        <p className="text-sm font-semibold text-foreground">{profile.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</p>
                      </div>
                      <button 
                        onClick={() => {
                          signOut();
                          setProfileOpen(false);
                        }}
                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut size={16} />
                        Cerrar sesión
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
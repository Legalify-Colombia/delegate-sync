import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'news' | 'staff_request' | 'speaking_queue' | 'rating' | 'voting';
  created_at: string;
  read: boolean;
  reference_id?: string;
}

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    fetchNotifications();
    
    // Set up real-time subscriptions based on role
    const channels: any[] = [];

    // All users get announcements
    const announcementsChannel = supabase
      .channel('announcements_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          addNotification({
            title: 'Nuevo Anuncio',
            message: payload.new.title,
            type: 'announcement',
            reference_id: payload.new.id
          });
        }
      )
      .subscribe();
    channels.push(announcementsChannel);

    // Role-specific subscriptions
    if (profile.role === 'staff' || profile.role === 'admin') {
      // Staff gets new staff requests
      const staffRequestsChannel = supabase
        .channel('staff_requests_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'staff_requests'
          },
          (payload) => {
            addNotification({
              title: 'Nueva Solicitud de Staff',
              message: payload.new.title,
              type: 'staff_request',
              reference_id: payload.new.id
            });
          }
        )
        .subscribe();
      channels.push(staffRequestsChannel);
    }

    if (profile.role === 'communications_secretary' || profile.role === 'admin') {
      // Communications secretary gets news for approval
      const newsChannel = supabase
        .channel('news_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'news_publications',
            filter: 'status=eq.submitted_for_review'
          },
          (payload) => {
            addNotification({
              title: 'Noticia Pendiente de Aprobación',
              message: payload.new.title,
              type: 'news',
              reference_id: payload.new.id
            });
          }
        )
        .subscribe();
      channels.push(newsChannel);
    }

    if (profile.role === 'committee_secretary' || profile.role === 'admin') {
      // Committee secretary gets speaking queue requests
      const speakingQueueChannel = supabase
        .channel('speaking_queue_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'speaking_queue',
            filter: `committee_id=eq.${profile.committee_id}`
          },
          (payload) => {
            addNotification({
              title: 'Nueva Solicitud de Turno',
              message: 'Un delegado ha solicitado turno para hablar',
              type: 'speaking_queue',
              reference_id: payload.new.id
            });
          }
        )
        .subscribe();
      channels.push(speakingQueueChannel);
    }

    if (profile.role === 'delegate') {
      // Delegates get ratings and committee updates
      const ratingsChannel = supabase
        .channel('ratings_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ratings',
            filter: `delegate_id=eq.${profile.id}`
          },
          () => {
            addNotification({
              title: 'Nueva Calificación',
              message: 'Has recibido una nueva calificación',
              type: 'rating'
            });
          }
        )
        .subscribe();
      channels.push(ratingsChannel);

      const detailedRatingsChannel = supabase
        .channel('detailed_ratings_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'detailed_ratings',
            filter: `delegate_id=eq.${profile.id}`
          },
          () => {
            addNotification({
              title: 'Nueva Calificación Detallada',
              message: 'Has recibido una nueva calificación detallada',
              type: 'rating'
            });
          }
        )
        .subscribe();
      channels.push(detailedRatingsChannel);

      // Committee status changes for delegates
      if (profile.committee_id) {
        const committeeChannel = supabase
          .channel('committee_status_notifications')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'committees',
              filter: `id=eq.${profile.committee_id}`
            },
            (payload) => {
              const statusLabels = {
                active: 'Debate Activo',
                voting: 'Votación Iniciada',
                paused: 'Comité en Pausa'
              };
              
              addNotification({
                title: 'Estado del Comité Actualizado',
                message: `El comité está ahora: ${statusLabels[payload.new.current_status] || payload.new.current_status}`,
                type: 'announcement'
              });
            }
          )
          .subscribe();
        channels.push(committeeChannel);
      }
    }

    if (profile.role === 'press') {
      // Press gets news status updates
      const newsStatusChannel = supabase
        .channel('news_status_notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'news_publications',
            filter: `author_id=eq.${profile.id}`
          },
          (payload) => {
            const statusLabels = {
              approved: 'Aprobada',
              rejected: 'Rechazada',
              published_internal: 'Publicada Internamente'
            };
            
            if (payload.new.status !== payload.old?.status) {
              addNotification({
                title: 'Estado de Noticia Actualizado',
                message: `Tu noticia "${payload.new.title}" ha sido ${statusLabels[payload.new.status] || payload.new.status}`,
                type: 'news',
                reference_id: payload.new.id
              });
            }
          }
        )
        .subscribe();
      channels.push(newsStatusChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [profile]);

  const fetchNotifications = async () => {
    if (!profile) return;

    // For now, we'll create notifications from recent activity
    // In a real implementation, you'd have a notifications table
    const notifications: Notification[] = [];

    try {
      // Recent announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      announcements?.forEach(announcement => {
        notifications.push({
          id: `announcement_${announcement.id}`,
          title: 'Anuncio',
          message: announcement.title,
          type: 'announcement',
          created_at: announcement.created_at,
          read: false,
          reference_id: announcement.id
        });
      });

      // Role-specific notifications
      if (profile.role === 'staff' || profile.role === 'admin') {
        const { data: staffRequests } = await supabase
          .from('staff_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        staffRequests?.forEach(request => {
          notifications.push({
            id: `staff_request_${request.id}`,
            title: 'Solicitud de Staff Pendiente',
            message: request.title,
            type: 'staff_request',
            created_at: request.created_at,
            read: false,
            reference_id: request.id
          });
        });
      }

      if (profile.role === 'communications_secretary' || profile.role === 'admin') {
        const { data: newsForReview } = await supabase
          .from('news_publications')
          .select('*')
          .eq('status', 'submitted_for_review')
          .order('created_at', { ascending: false })
          .limit(5);

        newsForReview?.forEach(news => {
          notifications.push({
            id: `news_review_${news.id}`,
            title: 'Noticia Pendiente de Aprobación',
            message: news.title,
            type: 'news',
            created_at: news.created_at,
            read: false,
            reference_id: news.id
          });
        });
      }

      if (profile.role === 'committee_secretary' && profile.committee_id) {
        const { data: speakingRequests } = await supabase
          .from('speaking_queue')
          .select('*')
          .eq('committee_id', profile.committee_id)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false })
          .limit(5);

        speakingRequests?.forEach(request => {
          notifications.push({
            id: `speaking_${request.id}`,
            title: 'Nueva Solicitud de Turno',
            message: 'Un delegado ha solicitado turno para hablar',
            type: 'speaking_queue',
            created_at: request.requested_at,
            read: false,
            reference_id: request.id
          });
        });
      }

      // Sort by date and set state
      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);

    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const addNotification = (notificationData: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `${notificationData.type}_${Date.now()}`,
      created_at: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification
  };
}
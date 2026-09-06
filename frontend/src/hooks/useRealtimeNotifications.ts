import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/stores/appStore';
import { useNotificationStore, Notification } from '@/stores/notificationStore';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export function useRealtimeNotifications() {
    const { currentUser, currentTenant } = useAppStore();
    const { setNotifications, addNotification, clear } = useNotificationStore();
    const socketRef = useRef<Socket | null>(null);

    // Fetch initial notifications
    useEffect(() => {
        if (!currentUser || !currentTenant) {
            clear();
            return;
        }

        const fetchHistory = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                
                const response = await axios.get(`${API_BASE_URL}/api/notifications`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                
                if (response.data) {
                    setNotifications(response.data);
                }
            } catch (err) {
                console.error('Failed to fetch notifications history:', err);
            }
        };

        fetchHistory();
    }, [currentUser, currentTenant, setNotifications, clear]);

    // Setup Socket.io connection
    useEffect(() => {
        if (!currentUser || !currentTenant) return;

        // Initialize Socket.io
        const socket = io(API_BASE_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to real-time notification service');
            socket.emit('register', { 
                userId: currentUser.id, 
                organizationId: currentTenant.id 
            });
        });

        socket.on('notification', (notification: Notification) => {
            addNotification(notification);
            
            // Show toast based on type
            const title = notification.title;
            const message = notification.message;
            
            switch (notification.type) {
                case 'ERROR':
                    toast.error(title, { description: message });
                    break;
                case 'SUCCESS':
                    toast.success(title, { description: message });
                    break;
                case 'WARNING':
                    toast.warning(title, { description: message });
                    break;
                default:
                    toast.info(title, { description: message });
                    break;
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from real-time notification service');
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [currentUser, currentTenant, addNotification]);

    return socketRef;
}

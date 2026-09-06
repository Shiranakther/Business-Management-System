import { create } from 'zustand';

export interface Notification {
    id: string;
    organization_id: string;
    user_id: string | null;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    link: string | null;
    is_read: boolean;
    created_at: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    
    setNotifications: (notifications: Notification[]) => void;
    addNotification: (notification: Notification) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,
    
    setNotifications: (notifications) => set({ 
        notifications,
        unreadCount: notifications.filter(n => !n.is_read).length
    }),
    
    addNotification: (notification) => set((state) => {
        // Prevent duplicates
        if (state.notifications.find(n => n.id === notification.id)) {
            return state;
        }
        const updated = [notification, ...state.notifications];
        return {
            notifications: updated,
            unreadCount: updated.filter(n => !n.is_read).length
        };
    }),
    
    markAsRead: (id) => set((state) => {
        const updated = state.notifications.map(n => 
            n.id === id ? { ...n, is_read: true } : n
        );
        return {
            notifications: updated,
            unreadCount: updated.filter(n => !n.is_read).length
        };
    }),
    
    markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
    })),
    
    clear: () => set({ notifications: [], unreadCount: 0 })
}));

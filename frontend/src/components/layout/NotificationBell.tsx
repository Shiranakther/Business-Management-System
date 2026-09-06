import { useState } from 'react';
import { Bell, Check, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotificationStore } from '@/stores/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        markAsRead(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await axios.put(`${API_BASE_URL}/api/notifications/${id}/read`, {}, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
            }
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;
        markAllAsRead();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await axios.put(`${API_BASE_URL}/api/notifications/read-all`, {}, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
            }
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const handleNotificationClick = (link: string | null) => {
        setIsOpen(false);
        if (link) {
            navigate(link);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 text-xs font-normal text-muted-foreground hover:text-foreground"
                            onClick={handleMarkAllAsRead}
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>
                
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            You have no notifications.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <div 
                                    key={notification.id}
                                    className={cn(
                                        "flex flex-col gap-1 p-4 text-sm transition-colors cursor-pointer hover:bg-muted/50 border-b border-border/50 last:border-0",
                                        !notification.is_read ? "bg-muted/20" : ""
                                    )}
                                    onClick={() => {
                                        if (!notification.is_read) {
                                            handleMarkAsRead(notification.id, { stopPropagation: () => {} } as any);
                                        }
                                        handleNotificationClick(notification.link);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {notification.type === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                                            {notification.type === 'ERROR' && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                                            {notification.type === 'SUCCESS' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                                            {notification.type === 'INFO' && <Info className="w-4 h-4 text-blue-500 shrink-0" />}
                                            <span className="font-semibold line-clamp-1">{notification.title}</span>
                                        </div>
                                        {!notification.is_read && (
                                            <span className="w-2 h-2 mt-1 rounded-full bg-blue-500 shrink-0" />
                                        )}
                                    </div>
                                    <span className="text-muted-foreground line-clamp-2">
                                        {notification.message}
                                    </span>
                                    <span className="text-xs text-muted-foreground/70 mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

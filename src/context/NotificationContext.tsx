import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './UserContext';

export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'approval';
    link?: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationContextProps {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (n: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>(() => {
        const stored = localStorage.getItem('agrovista_notifications');
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        localStorage.setItem('agrovista_notifications', JSON.stringify(notifications));
    }, [notifications]);

    const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => {
        const newNotification: AppNotification = {
            ...n,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        setNotifications(prev => [newNotification, ...prev]);

        // Simular envío de correo (solo log para demo por ahora)
        console.log(`[EMAIL SIMULATION] To: ${n.userId}, Subject: ${n.title}, Body: ${n.message}`);
    }, []);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const userNotifications = notifications.filter(n => n.userId === currentUser.id);
    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{
            notifications: userNotifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, limit } from 'firebase/firestore';

export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'reply' | 'system';
    message: string;
    read: boolean;
    createdAt: Date;
    link?: string;
    sender?: {
        name: string;
        avatar?: string;
    };
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            })) as Notification[];
            setNotifications(newNotifications);
        });

        return () => unsubscribe();
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (id: string) => {
        if (!user) return;
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        const notifRef = doc(db, 'users', user.uid, 'notifications', id);
        await updateDoc(notifRef, { read: true }).catch(console.error);
    };

    const markAllAsRead = async () => {
        if (!user) return;
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        const batch = writeBatch(db);
        const unreadNotifications = notifications.filter(n => !n.read);

        unreadNotifications.forEach(n => {
            const ref = doc(db, 'users', user.uid, 'notifications', n.id);
            batch.update(ref, { read: true });
        });

        if (unreadNotifications.length > 0) {
            await batch.commit().catch(console.error);
        }
    };

    const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
        // Implement if creating local notifications is needed, otherwise handled by backend
        console.log("Local notification added:", notification);
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

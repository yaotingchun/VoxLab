import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatForumDate } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Adjust import if needed
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from 'lucide-react';

export const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white relative"
                onClick={toggleDropdown}
            >
                <Bell className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-12 text-primary' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-black animate-pulse" />
                )}
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#111] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-[60]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <h3 className="font-bold text-white text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                                >
                                    <Check className="w-3 h-3" /> Mark all as read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No notifications yet.
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => markAsRead(notification.id)}
                                            className={`p-4 hover:bg-white/5 transition-colors cursor-pointer group ${!notification.read ? 'bg-primary/[0.03]' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                {/* Icon/Avatar */}
                                                <div className="shrink-0 mt-0.5">
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarImage src={notification.sender?.avatar || ""} alt="" className="object-cover" />
                                                        <AvatarFallback className={`flex items-center justify-center ${notification.type === 'like' ? 'bg-pink-500/10 text-pink-500' :
                                                            notification.type === 'comment' ? 'bg-blue-500/10 text-blue-500' :
                                                                'bg-gray-500/10 text-gray-500'
                                                            }`}>
                                                            {notification.type === 'like' && <div className="i-lucide-heart w-4 h-4 fill-current" />}
                                                            {notification.type === 'comment' && <div className="i-lucide-message-circle w-4 h-4" />}
                                                            {notification.type === 'system' && <Bell className="w-4 h-4" />}
                                                            {!['like', 'comment', 'system'].includes(notification.type) && <UserIcon className="w-4 h-4" />}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 space-y-1">
                                                    <p className={`text-sm leading-snug ${!notification.read ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-600 group-hover:text-gray-500 transition-colors">
                                                        {formatForumDate(notification.createdAt)}
                                                    </p>
                                                </div>

                                                {/* Unread Indicator */}
                                                {!notification.read && (
                                                    <div className="shrink-0 self-center">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

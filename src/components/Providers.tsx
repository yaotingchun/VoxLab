"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ForumProvider } from "@/contexts/ForumContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ForumProvider>
                <NotificationProvider>
                    {children}
                </NotificationProvider>
            </ForumProvider>
        </AuthProvider>
    );
}

"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ForumProvider } from "@/contexts/ForumContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { FollowProvider } from "@/contexts/FollowContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ForumProvider>
                <NotificationProvider>
                    <FollowProvider>
                        {children}
                    </FollowProvider>
                </NotificationProvider>
            </ForumProvider>
        </AuthProvider>
    );
}

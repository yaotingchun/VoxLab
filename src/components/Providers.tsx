"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ForumProvider } from "@/contexts/ForumContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ForumProvider>
                {children}
            </ForumProvider>
        </AuthProvider>
    );
}

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

interface UserProfileProps {
    displayName: string;
    rank?: string;
    className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
    displayName,
    rank = "Elite Speaker",
    className = ""
}) => {
    const router = useRouter();
    const initial = displayName?.charAt(0).toUpperCase() || "U";

    return (
        <div
            onClick={() => router.push('/dashboard/profile')}
            className={`flex items-center gap-3 group cursor-pointer active:scale-95 transition-all ${className}`}
        >
            <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-white transition-colors group-hover:text-primary whitespace-nowrap">
                    {displayName}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    {rank}
                </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-lg flex items-center justify-center text-sm font-bold group-hover:border-primary/50 transition-all overflow-hidden shrink-0">
                {initial}
            </div>
        </div>
    );
};

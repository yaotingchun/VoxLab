"use client";

import React from 'react';
import { Sparkles, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export const ForumHeader = () => {
    const { user } = useAuth();
    const { stats } = useForum();
    const { profile } = useUserProfile();

    const xp = profile?.stats ? (profile.stats.postsCount * 10) + (profile.stats.commentsCount * 5) + (profile.stats.likesReceived * 2) + ((profile.stats.bestAnswersCount || 0) * 50) : 0;
    const level = Math.floor(xp / 100) + 1;

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            {/* Welcome Compact Card */}
            <div className="md:col-span-8 bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex items-center justify-between group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white mb-1">
                        Hello, <span className="text-indigo-400">{user?.displayName?.split(' ')[0] || 'Community Member'}</span> 👋
                    </h2>
                    <p className="text-sm text-gray-400">
                        Ready to level up your presentation skills today?
                    </p>
                </div>

                <div className="relative z-10 hidden sm:block">
                    <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-medium text-indigo-300">Level {level} Contributor</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="md:col-span-4 grid grid-cols-2 gap-4">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col justify-center items-center hover:bg-white/5 transition-colors group/stat">
                    <div className="p-2 rounded-full bg-green-500/10 text-green-400 mb-2 group-hover/stat:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold text-white">{stats.postsToday}</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">New Posts</span>
                </div>

                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col justify-center items-center hover:bg-white/5 transition-colors group/stat">
                    <div className="p-2 rounded-full bg-blue-500/10 text-blue-400 mb-2 group-hover/stat:scale-110 transition-transform">
                        <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold text-white">{stats.onlineUsers}</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Online</span>
                </div>
            </div>
        </div>
    );
};

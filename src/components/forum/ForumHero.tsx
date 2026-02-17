import React from 'react';
import { Sparkles, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';

export const ForumHero = () => {
    const { user } = useAuth();
    const { stats } = useForum();

    return (
        <div className="relative overflow-hidden rounded-3xl bg-[#111] border border-white/5 shadow-2xl mb-12 group">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-[#0b0b0b] to-purple-900/20 opacity-80 group-hover:opacity-100 transition-opacity duration-1000" />

            {/* Animated Orbs */}
            <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] animate-spin-slow pointer-events-none" />
            <div className="absolute bottom-[-50%] right-[-20%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />

            <div className="relative z-10 p-6 md:p-8 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-8">

                {/* Text Content */}
                <div className="max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium uppercase tracking-wider animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles className="w-3 h-3" />
                        <span>Community Hub</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        Welcome back, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            {user?.displayName?.split(' ')[0] || 'Explorer'}
                        </span>
                    </h1>

                    <p className="text-base text-gray-400 max-w-lg leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                        Join the conversation, share your insights, and connect with other presentation enthusiasts.
                    </p>
                </div>

                {/* Stats / Visuals */}
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                        <MessageSquare className="w-6 h-6 text-indigo-400 mb-3" />
                        <div className="text-2xl font-bold text-white mb-0.5">{stats.postsToday}</div>
                        <div className="text-xs text-gray-400">Daily Discussions</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                        <Users className="w-6 h-6 text-purple-400 mb-3" />
                        <div className="text-2xl font-bold text-white mb-0.5">{stats.activeMembers}</div>
                        <div className="text-xs text-gray-400">Active Members</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

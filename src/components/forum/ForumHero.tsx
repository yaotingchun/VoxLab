import React from 'react';
import { Sparkles, MessageSquare, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';
import Link from 'next/link';

export const ForumHero = () => {
    const { user } = useAuth();
    const { stats } = useForum();

    return (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0a0a0a] border border-white/5 shadow-2xl mb-12 group isolates">
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/40 via-[#0a0a0a] to-black opacity-80" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />

            {/* Animated Orbs */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-blob pointer-events-none mix-blend-screen" />

            <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-12">

                {/* Text Content */}
                <div className="max-w-2xl space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-primary-foreground text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles className="w-3.5 h-3.5 fill-primary" />
                        <span>Community Hub</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 drop-shadow-sm">
                        Welcome back, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-pink-400 animate-gradient-x">
                            {user?.displayName?.split(' ')[0] || 'Explorer'}
                        </span>
                    </h1>

                    <p className="text-lg text-gray-400 max-w-lg leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                        Join the conversation, share your insights, and connect with other presentation enthusiasts in our vibrant community.
                    </p>

                    <div className="flex flex-wrap gap-4 pt-2 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                        <Link
                            href="/forum?filter=new"
                            className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Explore Discussions
                        </Link>
                        <Link
                            href="/forum?filter=following"
                            className="px-6 py-3 rounded-xl bg-white/5 text-white font-bold border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-md hover:scale-105 active:scale-95"
                        >
                            <Users className="w-4 h-4" />
                            My Network
                        </Link>
                    </div>
                </div>

                {/* Stats / Visuals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto min-w-[300px] animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 group/card hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 text-primary group-hover/card:scale-110 transition-transform duration-300 border border-primary/20">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div className="text-3xl font-black text-white mb-1 tracking-tight">{stats.postsToday}</div>
                        <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            Daily Discussions
                            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all" />
                        </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 group/card hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400 group-hover/card:scale-110 transition-transform duration-300 border border-purple-500/20">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="text-3xl font-black text-white mb-1 tracking-tight">{stats.activeMembers}</div>
                        <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            Active Members
                            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

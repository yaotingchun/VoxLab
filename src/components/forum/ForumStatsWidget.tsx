import React from 'react';
import { MessageSquare, Users, TrendingUp } from 'lucide-react';
import { useForum } from '@/contexts/ForumContext';

export const ForumStatsWidget = () => {
    const { stats } = useForum();

    return (
        <div className="bg-[#111] rounded-2xl border border-white/5 p-5 space-y-4 mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Community Stats
            </h3>

            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1 text-primary">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium uppercase">Daily</span>
                    </div>
                    <div className="text-xl font-bold text-white tracking-tight">{stats.postsToday}</div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1 text-purple-400">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium uppercase">Active</span>
                    </div>
                    <div className="text-xl font-bold text-white tracking-tight">{stats.activeMembers}</div>
                </div>
            </div>
        </div>
    );
};

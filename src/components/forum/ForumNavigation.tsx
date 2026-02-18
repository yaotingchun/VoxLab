import React from 'react';
import { LayoutDashboard, MessageSquare, Star, Hash, Users, Zap, TrendingUp, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FORUM_categoryGroups } from '@/lib/forum-data';

interface ForumNavigationProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    popularTags: { name: string; count: number }[];
}

export const ForumNavigation: React.FC<ForumNavigationProps> = ({ activeFilter, onFilterChange, popularTags }) => {
    const navItems = [
        { id: 'all', label: 'All Posts', icon: LayoutDashboard },
        { id: 'new', label: 'New & Trending', icon: Flame },
        { id: 'following', label: 'Following', icon: Star },
    ];

    return (
        <div className="space-y-10 pb-4">
            {/* Primary Nav */}
            <div className="space-y-2">
                <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Feed</h3>
                {navItems.map((item) => (
                    <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => onFilterChange(item.id)}
                        className={`w-full justify-start gap-4 px-4 h-12 text-sm font-semibold rounded-xl transition-all duration-300 group relative overflow-hidden ${activeFilter === item.id
                            ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {activeFilter === item.id && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                        )}
                        <item.icon className={`w-5 h-5 transition-transform duration-300 ${activeFilter === item.id ? 'text-white scale-110' : 'text-gray-500 group-hover:text-white group-hover:scale-110'}`} />
                        <span className="relative z-10">{item.label}</span>
                    </Button>
                ))}
            </div>

            {/* Communities (Categories) */}
            <div className="space-y-6">
                <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Communities
                </h3>
                <div className="space-y-8">
                    {Object.entries(FORUM_categoryGroups).map(([group, topics]) => (
                        <div key={group} className="space-y-2">
                            <h4 className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-gray-600" />
                                {group}
                            </h4>
                            <div className="space-y-1">
                                {topics.map(topic => (
                                    <button
                                        key={topic}
                                        onClick={() => onFilterChange(`tag:${topic}`)}
                                        className={`w-full text-left px-4 py-2.5 text-sm rounded-xl transition-all duration-200 flex items-center gap-3 group relative ${activeFilter === `tag:${topic}`
                                            ? 'bg-white/5 text-primary font-medium'
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeFilter === `tag:${topic}`
                                            ? 'bg-primary shadow-[0_0_10px_rgba(109,40,217,0.5)] scale-125'
                                            : 'bg-gray-800 group-hover:bg-gray-600'
                                            }`} />
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Popular Tags */}
            <div>
                <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Trending Topics
                </h3>
                <div className="flex flex-wrap gap-2 px-2">
                    {popularTags.map((tag) => (
                        <button
                            key={tag.name}
                            onClick={() => onFilterChange(`tag:${tag.name}`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border ${activeFilter === `tag:${tag.name}`
                                ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_15px_rgba(109,40,217,0.2)]'
                                : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Hash className="w-3 h-3 opacity-50" />
                            {tag.name}
                            <span className="ml-1 opacity-50 text-[10px]">{tag.count}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

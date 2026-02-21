
import React from 'react';
import { MessageSquare, Hash, Zap, Users, Trophy, Mic, Video, Smile, Activity, HelpCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ForumSidebarProps {
    activeTag: string;
    onTagChange: (tag: string) => void;
    stats: {
        totalMembers: number;
        totalDiscussions: number;
    };
    tagCounts: Record<string, number>;
}

export const ForumSidebar: React.FC<ForumSidebarProps> = ({ activeTag, onTagChange, stats, tagCounts }) => {

    // User provided categories mapped to icons
    const categories = [
        { name: 'Presentation', icon: Mic },
        { name: 'Interview', icon: Video },
        { name: 'Confidence', icon: Zap },
        { name: 'Pronunciation', icon: Activity },
        { name: 'Pause Control', icon: Hash },
        { name: 'Beginner Help', icon: HelpCircle },
        { name: 'Facial Expression', icon: Smile },
        { name: 'Posture', icon: User },
    ];

    // Get top 10 other tags for "Popular Tags" excluding the main categories
    const popularTags = Object.keys(tagCounts)
        .filter(tag => !categories.some(cat => cat.name.toLowerCase() === tag.toLowerCase()))
        .sort((a, b) => tagCounts[b] - tagCounts[a])
        .slice(0, 10);

    return (
        <div className="space-y-8">
            {/* Categories */}
            <div className="bg-[#111] border border-white/10 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Topics</h3>
                    {activeTag && (
                        <button
                            onClick={() => onTagChange('')}
                            className="text-[10px] text-primary hover:underline"
                        >
                            Clear Filter
                        </button>
                    )}
                </div>
                <div className="space-y-1">
                    {categories.map((cat) => {
                        const count = tagCounts[cat.name] || 0;
                        const isActive = activeTag === cat.name;

                        return (
                            <button
                                key={cat.name}
                                onClick={() => onTagChange(isActive ? '' : cat.name)}
                                className={`w-full flex items-center justify-between text-sm p-2 rounded-md transition-all group ${isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <cat.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'text-gray-500 group-hover:text-primary'}`} />
                                    <span>{cat.name}</span>
                                </div>
                                <span className={`text-xs transition-colors ${isActive ? 'text-primary' : 'text-gray-600 group-hover:text-white'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Popular Tags */}
            {popularTags.length > 0 && (
                <div className="bg-[#111] border border-white/10 rounded-lg p-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Popular Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {popularTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => onTagChange(activeTag === tag ? '' : tag)}
                                className={`text-xs px-2.5 py-1 rounded border transition-all flex items-center gap-1 ${activeTag === tag
                                    ? 'bg-primary/20 text-primary border-primary/30'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <Hash className="w-3 h-3 opacity-50" />
                                {tag}
                                <span className="ml-1 opacity-50 text-[10px]">({tagCounts[tag]})</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Community Stats */}
            <div className="bg-[#111] border border-white/10 rounded-lg p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Community Stats</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Users className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-white">{stats.totalMembers}</div>
                            <div className="text-xs text-gray-500">Active Members</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <MessageSquare className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-white">{stats.totalDiscussions}</div>
                            <div className="text-xs text-gray-500">Discussions</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

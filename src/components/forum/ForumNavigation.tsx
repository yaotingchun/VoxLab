import React from 'react';
import { LayoutDashboard, MessageSquare, Star, Hash, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ForumNavigationProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    popularTags: { name: string; count: number }[];
}

export const ForumNavigation: React.FC<ForumNavigationProps> = ({ activeFilter, onFilterChange, popularTags }) => {
    const navItems = [
        { id: 'all', label: 'All Forums', icon: LayoutDashboard },
        { id: 'new', label: 'New Posts', icon: MessageSquare },
        { id: 'following', label: 'Following', icon: Star },
    ];

    return (
        <div className="space-y-8 sticky top-28">
            <div className="space-y-2">
                {navItems.map((item) => (
                    <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => onFilterChange(item.id)}
                        className={`w-full justify-start gap-3 px-4 ${activeFilter === item.id ? 'bg-[#1F1F1F] text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </Button>
                ))}
            </div>

            {/* Popular Tags */}
            <div>
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Hash className="w-4 h-4" /> Popular Tags
                </h3>
                <div className="space-y-1">
                    {popularTags.map((tag) => (
                        <button
                            key={tag.name}
                            onClick={() => onFilterChange(`tag:${tag.name}`)}
                            className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-md transition-colors group ${activeFilter === `tag:${tag.name}` ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-gray-600 group-hover:text-gray-500">#</span>
                                {tag.name}
                            </span>
                            <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">{tag.count}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

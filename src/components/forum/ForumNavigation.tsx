import React, { useState } from 'react';
import { LayoutDashboard, MessageSquare, Star, Hash, Users, Zap, TrendingUp, Flame, ChevronDown, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FORUM_categoryGroups } from '@/lib/forum-data';
import { motion, AnimatePresence } from 'framer-motion';

interface ForumNavigationProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    popularTags: { name: string; count: number }[];
    isCollapsed?: boolean;
}

export const ForumNavigation: React.FC<ForumNavigationProps> = ({ activeFilter, onFilterChange, popularTags, isCollapsed = false }) => {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        'Speaking Scenarios': true,
        'Voice & Speech': false,
        'Non-Verbal Communication': false,
        'Community': false,
        'Trending Topics': true
    });
    const [isCommunitiesOpen, setIsCommunitiesOpen] = useState(true);

    const toggleSection = (section: string) => {
        if (isCollapsed) return;
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const navItems = [
        { id: '/dashboard', label: 'Home', icon: Home },
        { id: 'all', label: 'All Posts', icon: LayoutDashboard },
        { id: 'new', label: 'New & Trending', icon: Flame },
        { id: 'following', label: 'Following', icon: Star },
    ];

    return (
        <motion.div
            initial={false}
            animate={{ width: isCollapsed ? 64 : 240 }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="space-y-4 pb-4 overflow-x-hidden no-scrollbar"
        >
            {/* Primary Nav */}
            <div className="space-y-1">
                {navItems.map((item) => (
                    <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => onFilterChange(item.id)}
                        className={`w-full justify-start gap-3 px-4 h-11 text-sm font-bold rounded-xl transition-all duration-300 group relative overflow-hidden ${activeFilter === item.id
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            } ${isCollapsed ? 'px-4' : ''}`}
                    >
                        <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${activeFilter === item.id ? 'text-primary scale-110' : 'text-gray-500 group-hover:text-white group-hover:scale-110'}`} />
                        {!isCollapsed && <span className="relative z-10">{item.label}</span>}
                    </Button>
                ))}

                {/* Communities Parent Item */}
                <Button
                    variant="ghost"
                    onClick={() => setIsCommunitiesOpen(!isCommunitiesOpen)}
                    className={`w-full justify-start gap-3 px-4 h-11 text-sm font-bold rounded-xl transition-all duration-300 group relative overflow-hidden ${isCommunitiesOpen && !isCollapsed ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isCollapsed ? 'px-4' : ''}`}
                >
                    <Users className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isCommunitiesOpen && !isCollapsed ? 'text-primary' : 'text-gray-500 group-hover:text-white'}`} />
                    {!isCollapsed && (
                        <>
                            <span className="relative z-10 flex-1 text-left">Communities</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isCommunitiesOpen ? 'rotate-180' : ''}`} />
                        </>
                    )}
                </Button>

                {/* Nested Communities Sub-categories */}
                <AnimatePresence initial={false}>
                    {isCommunitiesOpen && !isCollapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-white/[0.02] rounded-2xl mt-1 mx-1 border border-white/[0.05]"
                        >
                            <div className="py-2 space-y-1">
                                {Object.entries(FORUM_categoryGroups).map(([group, topics]) => (
                                    <div key={group} className="space-y-0">
                                        <button
                                            onClick={() => toggleSection(group)}
                                            className="w-full flex items-start justify-between px-4 py-2.5 text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-wider group transition-colors text-left"
                                        >
                                            <div className="flex items-start gap-2.5 pt-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 transition-colors shrink-0 ${openSections[group] ? 'bg-primary shadow-[0_0_8px_rgba(109,40,217,0.4)]' : 'bg-gray-700'}`} />
                                                <span className="leading-tight">{group}</span>
                                            </div>
                                            <ChevronDown className={`w-3 h-3 mt-0.5 transition-transform duration-300 shrink-0 ${openSections[group] ? 'rotate-180 text-primary' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {openSections[group] && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="space-y-0.5 mb-2 px-3">
                                                        {topics.map(topic => (
                                                            <button
                                                                key={topic}
                                                                onClick={() => onFilterChange(`tag:${topic}`)}
                                                                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-2.5 group relative ${activeFilter === `tag:${topic}`
                                                                    ? 'bg-primary/5 text-primary font-bold'
                                                                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
                                                                    }`}
                                                            >
                                                                <span className={`w-1 h-1 rounded-full transition-all duration-300 ${activeFilter === `tag:${topic}`
                                                                    ? 'bg-primary scale-125'
                                                                    : 'bg-transparent group-hover:bg-gray-700'
                                                                    }`} />
                                                                {topic}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Popular Tags (Trending Topics) */}
                <Button
                    variant="ghost"
                    onClick={() => toggleSection('Trending Topics')}
                    className={`w-full justify-start gap-3 px-4 h-11 text-sm font-bold rounded-xl transition-all duration-300 group relative overflow-hidden ${openSections['Trending Topics'] && !isCollapsed ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'} ${isCollapsed ? 'px-4' : ''}`}
                >
                    <TrendingUp className={`w-4 h-4 shrink-0 transition-transform duration-300 ${openSections['Trending Topics'] && !isCollapsed ? 'text-primary' : 'text-gray-500 group-hover:text-white'}`} />
                    {!isCollapsed && (
                        <>
                            <span className="relative z-10 flex-1 text-left">Trending Topics</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openSections['Trending Topics'] ? 'rotate-180' : ''}`} />
                        </>
                    )}
                </Button>

                <AnimatePresence initial={false}>
                    {openSections['Trending Topics'] && !isCollapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex flex-wrap gap-2 px-4 py-3">
                                {popularTags.map((tag) => (
                                    <button
                                        key={tag.name}
                                        onClick={() => onFilterChange(`tag:${tag.name}`)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 border ${activeFilter === `tag:${tag.name}`
                                            ? 'bg-primary/10 text-primary border-primary/30'
                                            : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        <Hash className="w-2.5 h-2.5 opacity-50" />
                                        {tag.name}
                                        <span className="ml-1 opacity-40 text-[9px] font-normal">{tag.count}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

"use client";
import React, { useState, useMemo } from 'react';
import { useForum } from '@/contexts/ForumContext';
import { CreatePostModal } from '@/components/forum/CreatePostModal';
import { ForumNavigation } from '@/components/forum/ForumNavigation';
import { ForumActivitySidebar } from '@/components/forum/ForumActivitySidebar';
import { ForumStatsWidget } from '@/components/forum/ForumStatsWidget';
import { ForumHeader } from '@/components/forum/ForumHeader';
import { ForumPostList } from '@/components/forum/ForumPostList';
import { Button } from '@/components/ui/button';

import { Plus, Filter, ArrowLeft, ChevronDown, Hash, MessageSquare, TrendingUp, Sparkles, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { useFollow } from '@/contexts/FollowContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForumPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { posts, loading } = useForum();
    const { user, logout } = useAuth();

    const { following, loadMyFollowData } = useFollow();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'new', 'following', 'tag:TagName'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Sync URL filter with state
    React.useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam) {
            setActiveFilter(filterParam);
        }
    }, [searchParams]);

    // Ensure follow data is loaded when user is present
    React.useEffect(() => {
        if (user) {
            loadMyFollowData();
        }
    }, [user, loadMyFollowData]);

    // Compute Data
    const { popularTags, recentPosts, filteredPosts } = useMemo(() => {
        const tagCounts: Record<string, number> = {};

        posts.forEach(post => {
            // Tag counts
            post.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const recent = [...posts].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).slice(0, 5);

        // Filter Logic
        let filtered = posts;
        if (activeFilter.startsWith('tag:')) {
            const tag = activeFilter.replace('tag:', '');
            filtered = posts.filter(p => p.tags.includes(tag));
        } else if (activeFilter === 'new') {
            filtered = [...posts].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        } else if (activeFilter === 'following') {
            if (user) {
                const followingUids = new Set(following.map(f => f.uid));
                filtered = posts.filter(p =>
                    p.authorId === user.uid ||
                    followingUids.has(p.authorId)
                );
            } else {
                filtered = [];
            }
        }

        if (searchQuery) {
            filtered = filtered.filter(post =>
                post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Sort by latest for the list view
        filtered.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        return {
            popularTags: sortedTags,
            recentPosts: recent,
            filteredPosts: filtered
        };
    }, [posts, activeFilter, searchQuery, user]);

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-primary/30 relative overflow-x-hidden pb-12">
            {/* Ambient Landing-Style Pulse Backgrounds */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="ambient-purple-pulse top-[-10%] left-[-10%] w-[60%] h-[60%] opacity-20" />
                <div className="ambient-purple-pulse bottom-[-10%] right-[-10%] w-[60%] h-[60%] opacity-10" />
            </div>

            <div className="relative z-10">
                <ForumHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    onLogout={() => logout()}
                />
            </div>

            <div className={`w-full transition-all duration-300`}>
                <div className="flex items-start">

                    {/* Left Sidebar (Navigation) */}
                    <motion.div
                        initial={false}
                        animate={{ width: isCollapsed ? 64 : 240 }}
                        transition={{ type: "spring", stiffness: 400, damping: 40, mass: 1 }}
                        className={`
                            fixed inset-y-0 left-0 z-[60] bg-[#111] border-r border-white/5 lg:bg-[#080808] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0
                            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        `}
                    >
                        <div className="h-full overflow-y-auto lg:sticky lg:top-24 flex flex-col no-scrollbar custom-scrollbar">
                            {/* Collapse Toggle - Desktop Only */}
                            <div className="hidden lg:flex items-center mb-4 py-4 justify-start px-0">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    className="h-11 w-full justify-start gap-3 px-4 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                                >
                                    <Menu className="w-4 h-4 shrink-0" />
                                    {!isCollapsed && <span className="font-bold text-sm">Menu</span>}
                                </Button>
                            </div>

                            <ForumNavigation
                                activeFilter={activeFilter}
                                onFilterChange={(filter) => {
                                    if (filter === '/dashboard') {
                                        router.push('/dashboard');
                                        return;
                                    }
                                    setActiveFilter(filter);
                                    setIsCollapsed(false); // Auto-expand on click
                                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                                }}
                                popularTags={popularTags}
                                isCollapsed={isCollapsed}
                            />
                        </div>
                    </motion.div>

                    {/* Overlay for mobile sidebar */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-[55] lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    {/* Main Content Area (Feed + Right Sidebar) */}
                    <div className="flex-1 min-w-0">
                        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                {/* Feed Column */}
                                <div className="lg:col-span-8 xl:col-span-8">
                                    {/* Feed Header Actions */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-2xl font-black text-white tracking-tight">
                                                {activeFilter.startsWith('tag:') ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] text-primary/70 font-bold uppercase tracking-[0.2em]">Topic</span>
                                                        {activeFilter.replace('tag:', '')}
                                                    </div>
                                                ) : (
                                                    activeFilter === 'all' ? 'Your Feed' :
                                                        activeFilter === 'new' ? 'New' :
                                                            activeFilter === 'following' ? 'Following' :
                                                                activeFilter
                                                )}
                                            </h1>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsSidebarOpen(true)}
                                                className="h-9 border-white/10 bg-[#111] text-gray-400 hover:text-white hover:bg-white/5 lg:hidden"
                                            >
                                                <Filter className="w-3.5 h-3.5 mr-2" />
                                                Filter
                                            </Button>
                                            <Button
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                New Post
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Feed List */}
                                    <div className="space-y-4 pb-24">
                                        {loading ? (
                                            Array.from({ length: 4 }).map((_, i) => (
                                                <div key={i} className="h-48 bg-[#111] rounded-2xl border border-white/5 animate-pulse" />
                                            ))
                                        ) : (
                                            <ForumPostList posts={filteredPosts} />
                                        )}
                                    </div>
                                </div>

                                {/* Right Sidebar (Activity) */}
                                <div className="hidden lg:block lg:col-span-3 space-y-6">
                                    <div className="sticky top-24">
                                        <ForumStatsWidget />
                                        <ForumActivitySidebar
                                            recentPosts={recentPosts}
                                            onStartDiscussion={() => setIsCreateModalOpen(true)}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>

                        <CreatePostModal
                            isOpen={isCreateModalOpen}
                            onClose={() => setIsCreateModalOpen(false)}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}

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
import { Plus, Filter, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

export default function ForumPage() {
    const searchParams = useSearchParams();
    const { posts, loading } = useForum();
    const { user } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'new', 'following', 'tag:TagName'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Sync URL filter with state
    React.useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam) {
            setActiveFilter(filterParam);
        }
    }, [searchParams]);

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
                filtered = posts.filter(p =>
                    p.authorId === user.uid ||
                    (p.likedBy && p.likedBy.includes(user.uid))
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
        <div className="min-h-screen bg-[#050505] relative overflow-x-hidden pb-12">

            <ForumHeader
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Sidebar (Navigation) */}
                    <div className={`
                        fixed inset-y-0 left-0 z-[60] w-64 lg:w-auto bg-[#111] lg:bg-transparent transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:col-span-3 xl:col-span-2
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}>
                        <div className="p-4 lg:p-0 h-full overflow-y-auto lg:sticky lg:top-24">
                            <ForumNavigation
                                activeFilter={activeFilter}
                                onFilterChange={(filter) => {
                                    setActiveFilter(filter);
                                    setIsSidebarOpen(false);
                                }}
                                popularTags={popularTags}
                            />
                        </div>
                    </div>

                    {/* Overlay for mobile sidebar */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-[55] lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    {/* Main Content (Feed) */}
                    <div className="lg:col-span-6 xl:col-span-7">
                        {/* Feed Header Actions */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                {activeFilter !== 'all' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                                        className="h-8 w-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </Button>
                                )}
                                <h1 className="text-xl font-bold text-white capitalize">
                                    {activeFilter.startsWith('tag:') ? (
                                        <span className="flex items-center gap-1">
                                            <span className="text-gray-500 font-normal">Topic:</span>
                                            {activeFilter.replace('tag:', '')}
                                        </span>
                                    ) : (activeFilter === 'all' ? 'Your Feed' : activeFilter)}
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
                                    className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
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
    );
}

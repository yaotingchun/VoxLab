"use client";

import React, { useState, useMemo } from 'react';
import { useForum } from '@/contexts/ForumContext';
import { PostCard } from '@/components/forum/PostCard';
import { CreatePostModal } from '@/components/forum/CreatePostModal';
import { ForumNavigation } from '@/components/forum/ForumNavigation';
import { ForumCategoryGrid } from '@/components/forum/ForumCategoryGrid';
import { ForumActivitySidebar } from '@/components/forum/ForumActivitySidebar';
import { ForumHeader } from '@/components/forum/ForumHeader';
import { ForumPostList } from '@/components/forum/ForumPostList';
import { Button } from '@/components/ui/button';
import { Plus, Search, Mic, Video, Zap, Activity, Hash, HelpCircle, Smile, User, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { Post } from '@/types/forum';

import { FORUM_SECTIONS, FORUM_TOPICS_FLAT, FORUM_categoryGroups } from '@/lib/forum-data';

export default function ForumPage() {
    const searchParams = useSearchParams();
    const { posts, loading } = useForum();
    const { user } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'new', 'following', 'tag:TagName'

    // Sync URL filter with state
    React.useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam) {
            setActiveFilter(filterParam);
        }
    }, [searchParams]);

    const forumSections = FORUM_SECTIONS;

    // Compute Data
    const { categoryStats, popularTags, recentPosts, filteredPosts } = useMemo(() => {
        const stats: Record<string, { count: number; views: number; latestPost?: Post }> = {};
        const tagCounts: Record<string, number> = {};

        // Initialize stats for All Specific Topics
        FORUM_TOPICS_FLAT.forEach(topic => {
            stats[topic.name] = { count: 0, views: 0 };
        });

        posts.forEach(post => {
            // 1. Stats per Topic Tag
            post.tags.forEach(tag => {
                if (stats[tag]) {
                    stats[tag].count++;
                    stats[tag].views += post.viewCount;
                    if (!stats[tag].latestPost || (post.createdAt?.toMillis() || 0) > (stats[tag].latestPost?.createdAt?.toMillis() || 0)) {
                        stats[tag].latestPost = post;
                    }
                }
                // Tag counts
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
            categoryStats: stats,
            popularTags: sortedTags,
            recentPosts: recent,
            filteredPosts: filtered
        };
    }, [posts, activeFilter, searchQuery]);

    const isDashboardView = activeFilter === 'all' && !searchQuery;

    return (
        <div className="min-h-screen bg-black pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Ambient Backgrounds */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute top-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-900/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[0%] left-[20%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[140px]" />
            </div>

            <div className="max-w-[1400px] mx-auto relative z-10">
                <ForumHeader />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Sidebar (Navigation) */}
                    <div className="hidden lg:block lg:col-span-3 xl:col-span-2">
                        <ForumNavigation
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                            popularTags={popularTags}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-6 xl:col-span-7">
                        <div className="flex items-center justify-between mb-8">
                            {/* Mobile Nav Placeholder or Title */}
                            {isDashboardView ? (
                                <h1 className="text-2xl font-bold text-white tracking-tight">Explore Topics</h1>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                                        className="rounded-full w-8 h-8 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </Button>
                                    <h1 className="text-2xl font-bold text-white tracking-tight capitalize">
                                        {activeFilter.startsWith('tag:') ? activeFilter.replace('tag:', '') : activeFilter}
                                    </h1>
                                </div>
                            )}

                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 px-6 h-10 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02]"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Start Discussion
                            </Button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-8">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <Input
                                placeholder="Search discussions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 bg-[#111] border-white/10 text-white focus-visible:ring-primary/50 rounded-lg text-sm"
                            />
                        </div>



                        {/* Content Switcher */}
                        {isDashboardView ? (
                            <ForumCategoryGrid
                                sections={forumSections}
                                stats={categoryStats}
                                onCategoryClick={(cat) => setActiveFilter(`tag:${cat}`)}
                            />
                        ) : (
                            <div className="space-y-4">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-20 bg-[#111] rounded border border-white/5 animate-pulse" />
                                    ))
                                ) : (
                                    <ForumPostList posts={filteredPosts} />
                                )}
                            </div>
                        )}


                    </div>

                    {/* Right Sidebar (Activity) */}
                    <div className="hidden lg:block lg:col-span-3">
                        <ForumActivitySidebar
                            recentPosts={recentPosts}
                            onStartDiscussion={() => setIsCreateModalOpen(true)}
                        />
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

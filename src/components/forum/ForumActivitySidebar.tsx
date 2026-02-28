'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { User, Activity, ArrowRight, Plus, Sparkles } from 'lucide-react';
import { Post } from '@/types/forum';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ForumActivitySidebarProps {
    recentPosts: Post[];
    onStartDiscussion?: () => void;
}

export const ForumActivitySidebar: React.FC<ForumActivitySidebarProps> = ({ recentPosts, onStartDiscussion }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="space-y-6 sticky top-32">
            {/* Start Discussion Card */}
            <div
                className={`bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 rounded-[2rem] p-6 relative overflow-hidden transition-all duration-500 z-10 group ${isHovered ? 'scale-[1.02] shadow-xl shadow-primary/25' : 'shadow-lg'}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Dynamic Backgrounds */}
                <div className="absolute inset-0 bg-[#0a0a0a] bg-opacity-90 z-0" />
                <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] bg-primary/30 rounded-full blur-[80px] animate-pulse z-0 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-start gap-4">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-inner text-primary">
                        <Sparkles className="w-6 h-6 fill-primary/20" />
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-white mb-2 leading-tight">Share your voice</h3>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">
                            Join the conversation. Ask questions, share insights, or start a new topic.
                        </p>
                    </div>

                    <button
                        onClick={onStartDiscussion}
                        className="w-full py-4 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 group-hover:translate-y-[-2px]"
                    >
                        <Plus className="w-4 h-4 text-primary-foreground group-hover:rotate-90 transition-transform duration-300" />
                        <span>Create New Post</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[1.5rem] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[60px] pointer-events-none opacity-20" />

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/10">
                        <Activity className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Activity</h3>
                </div>

                <div className="space-y-0 relative z-10">
                    {/* Timeline Line */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-full" />

                    {recentPosts.map((post, index) => (
                        <div key={post.id} className="relative pl-10 py-3 group">
                            {/* Timeline Dot */}
                            <div className="absolute left-[15px] top-[24px] w-2.5 h-2.5 rounded-full bg-[#1a1a1a] border-2 border-white/10 group-hover:border-primary group-hover:bg-primary transition-all z-20 shadow-[0_0_0_4px_#0a0a0a]" />

                            <Link
                                href={`/forum/${post.id}`}
                                className="block p-3 rounded-xl hover:bg-white/5 transition-all -ml-2"
                            >
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                                        {post.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <Avatar className="w-4 h-4 ring-1 ring-white/10">
                                                <AvatarImage src={post.authorAvatar || undefined} alt="" className="object-cover" />
                                                <AvatarFallback className="bg-primary/10 flex items-center justify-center">
                                                    <User className="w-2.5 h-2.5 text-gray-400" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="truncate max-w-[80px] text-gray-400 font-medium">{post.authorName}</span>
                                        </div>
                                        <span className="w-0.5 h-0.5 bg-gray-600 rounded-full" />
                                        <span className="text-primary/80">{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
                    <Link
                        href="/forum?filter=new"
                        className="w-full flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors group p-2 hover:bg-white/5 rounded-lg"
                    >
                        VIEW FEED
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

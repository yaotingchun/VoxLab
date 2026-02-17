import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { User, Activity, ArrowRight, Plus } from 'lucide-react';
import { Post } from '@/types/forum';

interface ForumActivitySidebarProps {
    recentPosts: Post[];
    onStartDiscussion?: () => void;
}

export const ForumActivitySidebar: React.FC<ForumActivitySidebarProps> = ({ recentPosts, onStartDiscussion }) => {
    return (
        <div className="space-y-6 sticky top-28 animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
            {/* Start Discussion Card */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:bg-white/[0.06] transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors duration-500" />

                <h3 className="text-lg font-bold text-white mb-2 relative z-10">Have something to share?</h3>
                <p className="text-sm text-gray-400 mb-6 relative z-10 leading-relaxed">
                    Start a new discussion to share your insights or ask questions to the community.
                </p>

                <button
                    onClick={onStartDiscussion}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 relative z-10 border border-white/10"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create New Post</span>
                </button>
            </div>

            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/20">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Activity className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Latest Activity</h3>
                </div>

                <div className="space-y-1 relative">
                    {/* Decorative Line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-white/5 rounded-full" />

                    {recentPosts.map((post) => (
                        <Link
                            key={post.id}
                            href={`/forum/${post.id}`}
                            className="block group relative pl-8 py-3 rounded-xl hover:bg-white/5 transition-all"
                        >
                            {/* Timestamp Dot */}
                            <div className="absolute left-[12px] top-[22px] w-2 h-2 rounded-full bg-[#333] border-2 border-[#0F0F0F] group-hover:bg-indigo-500 group-hover:scale-125 transition-all z-10" />

                            <div className="flex gap-3">
                                <div className="mt-1">
                                    {post.authorAvatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={post.authorAvatar} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                            <User className="w-4 h-4 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors line-clamp-2 leading-snug mb-1.5">
                                        {post.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="truncate max-w-[80px] text-gray-400">{post.authorName}</span>
                                        <span>•</span>
                                        <span className="text-indigo-400/80">{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                    <Link
                        href="/forum?filter=new"
                        className="w-full flex items-center justify-center gap-2 text-xs font-medium text-gray-500 hover:text-indigo-400 transition-colors group"
                    >
                        View all activity
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

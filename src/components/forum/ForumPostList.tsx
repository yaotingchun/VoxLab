
import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Eye, User, ThumbsUp } from 'lucide-react';
import { Post } from '@/types/forum';

interface ForumPostListProps {
    posts: Post[];
}

export const ForumPostList: React.FC<ForumPostListProps> = ({ posts }) => {
    if (posts.length === 0) {
        return (
            <div className="text-center py-20 bg-[#111] rounded-lg border border-white/5 border-dashed">
                <p className="text-gray-500 text-sm">No discussions found in this section.</p>
            </div>
        );
    }

    return (
        <div className="space-y-0 border-t border-white/5">
            {posts.map((post) => (
                <Link
                    key={post.id}
                    href={`/forum/${post.id}`}
                    className="block group relative p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-start gap-4">

                        {/* Avatar */}
                        <div className="shrink-0 mt-1">
                            {post.authorAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={post.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-black/50" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center ring-2 ring-black/50">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {/* Title */}
                            <h3 className="text-base font-semibold text-gray-200 group-hover:text-indigo-400 transition-colors mb-1 truncate pr-8">
                                {post.title}
                            </h3>

                            {/* Meta Row: Tags & Author & Time */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500">
                                <div className="flex gap-2">
                                    {post.tags.slice(0, 3).map((tag, i) => (
                                        <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5 group-hover:border-white/10 transition-colors">#{tag}</span>
                                    ))}
                                </div>
                                <span className="hidden sm:inline">•</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-400">{post.authorName}</span>
                                    <span>•</span>
                                    <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats (Right Side) */}
                        <div className="hidden sm:flex flex-col items-end gap-1 text-right min-w-[80px]">
                            <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-white transition-colors">
                                <span className="text-sm font-semibold">{post.commentCount}</span>
                                <MessageSquare className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                <span>{post.viewCount} views</span>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};

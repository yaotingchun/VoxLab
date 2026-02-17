
import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Eye, User, Clock } from 'lucide-react';
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
        <div className="space-y-1">
            {posts.map((post) => (
                <Link
                    key={post.id}
                    href={`/forum/${post.id}`}
                    className="block group bg-[#111] hover:bg-[#161616] border border-white/5 rounded-lg transition-all p-4"
                >
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="shrink-0">
                            {post.authorAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={post.authorAvatar} alt="" className="w-10 h-10 rounded-full bg-gray-800 object-cover border border-white/5" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-white/5">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-200 group-hover:text-primary transition-colors truncate mb-1">
                                {post.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 overflow-hidden">
                                <span className="font-medium text-gray-400">{post.authorName}</span>
                                <span>•</span>
                                <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                                {post.tags.length > 0 && (
                                    <>
                                        <span>•</span>
                                        <div className="flex gap-1">
                                            {post.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Stats - Desktop */}
                        <div className="hidden sm:flex items-center gap-6 px-4 border-l border-white/5 ml-4">
                            <div className="text-center min-w-[3rem]">
                                <div className="text-sm font-semibold text-gray-300">{post.commentCount}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Replies</div>
                            </div>
                            <div className="text-center min-w-[3rem]">
                                <div className="text-sm font-semibold text-gray-300">{post.viewCount}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Views</div>
                            </div>
                        </div>

                        {/* Arrow/Action (Mobile) */}
                        <div className="sm:hidden text-gray-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};

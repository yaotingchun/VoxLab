import React from 'react';
import { Post } from '@/types/forum';
import { PostCard } from './PostCard';

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
            {posts.map((post, index) => (
                <div
                    key={post.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both"
                    style={{ animationDelay: `${index * 150}ms` }}
                >
                    <PostCard post={post} />
                </div>
            ))}
        </div>
    );
};

"use client";

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ThumbsUp, Eye, User, ArrowUpRight, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';
import { useState } from 'react';
import { CreatePostModal } from './CreatePostModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Post } from '@/types/forum';

interface PostCardProps {
    post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const { user } = useAuth();
    const { deletePost } = useForum();
    const [showActions, setShowActions] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const isAuthor = user?.uid === post.authorId;

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDeleteModalOpen(true);
        setShowActions(false);
    };

    const confirmDelete = async () => {
        await deletePost(post.id);
        setIsDeleteModalOpen(false);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEditModalOpen(true);
        setShowActions(false);
    };

    return (
        <>
            <div className="block group relative">
                <Link href={`/forum/${post.id}`} className="block h-full relative">
                    {/* Glassy Background & Glow */}
                    <div className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-md border border-white/5 rounded-2xl group-hover:border-indigo-500/30 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-indigo-500/10 group-hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-purple-500/5 group-hover:to-indigo-500/5 transition-all duration-500 rounded-2xl opacity-0 group-hover:opacity-100" />
                    </div>

                    <div className="relative p-6 flex flex-col gap-4 h-full">

                        {/* Top: Tags & Time */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex flex-wrap gap-2">
                                {post.tags.slice(0, 3).map((tag, i) => (
                                    <span key={tag} className={`px-2.5 py-1 rounded-full font-medium border ${i === 0 ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-white/5 text-gray-400 border-white/5'}`}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                            <span className="text-gray-500 font-medium">
                                {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                            </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-gray-100 group-hover:text-white transition-colors leading-relaxed pr-8 line-clamp-2">
                            {post.title}
                        </h3>

                        {/* Spacer to push footer down */}
                        <div className="flex-1" />

                        {/* Bottom: Author & Stats */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
                            <div className="flex items-center gap-2.5">
                                {post.authorAvatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={post.authorAvatar} alt="" className="w-6 h-6 rounded-full object-cover ring-2 ring-black/50" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center ring-2 ring-black/50">
                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                    </div>
                                )}
                                <span className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                                    {post.authorName}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-gray-500 text-xs font-medium">
                                <div className="flex items-center gap-1.5 group-hover:text-indigo-400 transition-colors">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{post.commentCount}</span>
                                </div>
                                <div className="flex items-center gap-1.5 group-hover:text-gray-300 transition-colors">
                                    <Eye className="w-4 h-4" />
                                    <span>{post.viewCount}</span>
                                </div>
                                <div className="flex items-center gap-1.5 group-hover:text-gray-300 transition-colors">
                                    <ThumbsUp className="w-4 h-4" />
                                    <span>{post.likes}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>

                {isAuthor && (
                    <div className="absolute top-4 right-4 z-20">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowActions(!showActions);
                            }}
                            className="p-2 rounded-full bg-black/20 text-gray-400 hover:text-white hover:bg-black/40 transition-colors border border-white/5 backdrop-blur-xl"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showActions && (
                            <div className="absolute right-0 mt-2 w-36 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 z-50">
                                <button
                                    onClick={handleEdit}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                    <Edit className="w-3.5 h-3.5" /> Edit Post
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        )}

                        {showActions && (
                            <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowActions(false);
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal Portal/Wrapper */}
            {isEditModalOpen && (
                <div onClick={(e) => e.stopPropagation()}>
                    <CreatePostModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        initialData={post}
                    />
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div onClick={(e) => e.stopPropagation()}>
                    <ConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={confirmDelete}
                        title="Delete Post"
                        message="Are you sure you want to delete this post? This action cannot be undone."
                        confirmText="Delete"
                    />
                </div>
            )}
        </>
    );
};

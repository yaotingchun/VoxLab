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
                <Link href={`/forum/${post.id}`} className="block h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:via-purple-500/5 group-hover:to-indigo-500/5 transition-all duration-500 rounded-2xl" />

                    <div className="relative flex flex-col sm:flex-row gap-6 p-6 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 hover:border-indigo-500/30 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-indigo-500/10 group-hover:-translate-y-1 hover:bg-white/[0.04]">

                        {/* Main Content */}
                        <div className="flex-1 min-w-0 space-y-3">
                            {/* Header: Author & Time */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="flex items-center gap-2 p-1 pr-2 rounded-full bg-white/5 border border-white/5">
                                    {post.authorAvatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={post.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center">
                                            <User className="w-3 h-3 text-gray-400" />
                                        </div>
                                    )}
                                    <span className="font-medium text-gray-300">{post.authorName}</span>
                                </div>
                                <span>•</span>
                                <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors leading-snug">
                                {post.title}
                            </h3>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map(tag => (
                                    <span key={tag} className="px-2.5 py-1 rounded-md bg-[#1a1a1a] text-xs font-medium text-gray-400 border border-white/5 group-hover:border-white/10 transition-colors">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Stats / Action */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-1 pl-0 sm:pl-6 sm:border-l border-white/5 min-w-[100px]">
                            {/* Mobile: Arrow right */}
                            <div className="sm:hidden text-indigo-400">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>

                            {/* Desktop: Stats */}
                            <div className="flex items-center gap-6 sm:gap-2 sm:flex-col">
                                <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-indigo-400 transition-colors">
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="text-sm font-semibold">{post.commentCount}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    <Eye className="w-4 h-4" />
                                    <span className="text-xs">{post.viewCount}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500">
                                    <ThumbsUp className="w-4 h-4" />
                                    <span className="text-xs">{post.likes}</span>
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

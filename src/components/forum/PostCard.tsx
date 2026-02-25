"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { formatForumDate } from '@/lib/utils';
import { MessageSquare, ThumbsUp, Eye, User, MoreVertical, Edit, Trash2, Play, Share2, CornerUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';
import { CreatePostModal } from './CreatePostModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Post } from '@/types/forum';
import { ForumAuthorHover } from './ForumAuthorHover';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
interface PostCardProps {
    post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const { user } = useAuth();
    const { deletePost, likePost } = useForum();
    const [showActions, setShowActions] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [isLiked, setIsLiked] = useState(post.likedBy?.includes(user?.uid || ''));
    const [likeCount, setLikeCount] = useState(post.likes || 0);
    const [authorAvatar, setAuthorAvatar] = useState(post.authorAvatar);

    // Sync state with props
    React.useEffect(() => {
        setIsLiked(post.likedBy?.includes(user?.uid || ''));
        setLikeCount(post.likes || 0);
    }, [post.likedBy, post.likes, user]);

    // Fetch latest avatar from user profile to avoid stale denormalized data
    React.useEffect(() => {
        if (!post.authorId) return;

        const fetchLatestAvatar = async () => {
            try {
                // We use the forum author hover fetch logic style
                const userDoc = await getDoc(doc(db, "users", post.authorId));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    // Always update state to reflect the latest user profile (even if null)
                    setAuthorAvatar(data.photoURL || null);
                }
            } catch (error) {
                console.error("Failed to fetch latest avatar:", error);
            }
        };

        fetchLatestAvatar();
    }, [post.authorId]);

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

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;

        // Optimistic Update
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount((prev: number) => newIsLiked ? prev + 1 : prev - 1);

        try {
            await likePost(post.id);
        } catch (error) {
            // Revert on error
            setIsLiked(!newIsLiked);
            setLikeCount((prev: number) => newIsLiked ? prev - 1 : prev + 1);
            console.error("Failed to like post:", error);
        }
    };

    return (
        <>
            <div className="group relative bg-[#111] hover:bg-[#161616] rounded-2xl border border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-0.5">
                <Link href={`/forum/${post.id}`} className="block relative p-5 sm:p-7">

                    {/* Header: Avatar, Name, Time, More */}
                    <div className="flex items-center justify-between mb-3">
                        {/* Avatar + Name wrapped in hover card */}
                        <div className="flex items-center gap-3" onClick={e => e.preventDefault()}>
                            <ForumAuthorHover
                                authorId={post.authorId}
                                authorName={post.authorName}
                                authorAvatar={authorAvatar}
                            >
                                <div className="shrink-0 relative cursor-pointer">
                                    <div className="absolute inset-0 bg-primary/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Avatar className="relative w-8 h-8 ring-1 ring-transparent group-hover:ring-primary/30 transition-all">
                                        <AvatarImage src={authorAvatar || ""} alt="" className="object-cover" />
                                        <AvatarFallback className="bg-white/5 flex items-center justify-center ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
                                            <User className="w-4 h-4 text-gray-400" />
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </ForumAuthorHover>

                            {/* Meta */}
                            <div className="flex items-center gap-2">
                                <ForumAuthorHover
                                    authorId={post.authorId}
                                    authorName={post.authorName}
                                    authorAvatar={authorAvatar}
                                >
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors cursor-pointer hover:text-primary">
                                        {post.authorName}
                                    </span>
                                </ForumAuthorHover>
                                <span className="text-xs text-gray-600">•</span>
                                <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                                    {post.createdAt ? formatForumDate(post.createdAt.toDate()) : 'Just now'}
                                </span>
                                {post.tags.length > 0 && (
                                    <>
                                        <span className="text-xs text-gray-600">•</span>
                                        <span className="text-xs text-primary/80 font-medium bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                                            {post.tags[0]}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* More Button (if author) */}
                        {isAuthor && (
                            <div className="relative z-20">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowActions(!showActions);
                                    }}
                                    className="p-1.5 -mr-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>

                                {showActions && (
                                    <>
                                        <div className="absolute right-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 z-50 ring-1 ring-white/5">
                                            <button
                                                onClick={handleEdit}
                                                className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2.5 transition-colors"
                                            >
                                                <Edit className="w-3.5 h-3.5" /> Edit Post
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2.5 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        </div>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowActions(false);
                                            }}
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content Body - Removed padding-left to make it full width below header */}
                    <div className="mt-2">
                        {/* Title */}
                        {post.title && (
                            <h3 className="text-xl font-bold text-white mb-2 leading-snug group-hover:text-primary-foreground transition-colors">
                                {post.title}
                            </h3>
                        )}

                        {/* Text Snippet */}
                        {post.content && (
                            <p className="text-sm text-gray-400 line-clamp-3 mb-4 leading-relaxed whitespace-pre-line group-hover:text-gray-300 transition-colors">
                                {post.content}
                            </p>
                        )}

                        {/* Media Attachment */}
                        {post.mediaUrls && post.mediaUrls.length > 0 && (
                            <div
                                className="mt-2 mb-5 rounded-xl overflow-hidden bg-black border border-white/10 relative group/media max-w-2xl shadow-lg"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                            >
                                {post.mediaType === 'video' ? (
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/media:bg-black/40 transition-colors z-10 pointer-events-none">
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover/media:scale-110 transition-transform">
                                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                            </div>
                                        </div>
                                        <video
                                            src={post.mediaUrls[0]}
                                            className="w-full max-h-[400px] object-cover"
                                            controls
                                            preload="metadata"
                                        />
                                    </div>
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={post.mediaUrls[0]}
                                        alt="Post attachment"
                                        className="w-full h-auto max-h-[400px] object-cover transition-transform duration-700 group-hover/media:scale-[1.02]"
                                    />
                                )}
                            </div>
                        )}

                        {/* Footer Stats / Actions */}
                        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                            {/* Likes */}
                            <button
                                onClick={handleLike}
                                className={`flex items-center gap-2 group/like transition-all ${isLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400'}`}
                            >
                                <div className={`p-2 -ml-2 rounded-full transition-all duration-300 group-hover/like:bg-pink-500/10 ${isLiked ? 'bg-pink-500/10' : ''}`}>
                                    <ThumbsUp className={`w-4.5 h-4.5 transition-transform duration-300 ${isLiked ? 'fill-current scale-110' : 'group-hover/like:scale-110'}`} />
                                </div>
                                <span className="text-sm font-medium">{likeCount}</span>
                            </button>

                            {/* Comments */}
                            <div className="flex items-center gap-2 text-gray-500 group-hover:text-primary transition-colors group/comment">
                                <div className="p-2 -ml-2 rounded-full group-hover/comment:bg-primary/10 transition-colors">
                                    <MessageSquare className="w-4.5 h-4.5 group-hover/comment:scale-110 transition-transform" />
                                </div>
                                <span className="text-sm font-medium">{post.commentCount || 0}</span>
                            </div>

                            {/* Views */}
                            <div className="flex items-center gap-2 text-gray-500 group-hover:text-blue-400 transition-colors ml-auto">
                                <Eye className="w-4 h-4" />
                                <span className="text-xs font-medium">{post.viewCount || 0}</span>
                            </div>
                        </div>
                    </div>
                </Link>
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

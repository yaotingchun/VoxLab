"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, User, MessageSquare, ThumbsUp, Send, Loader2, Sparkles, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useForumPost } from '@/hooks/useForumPost';
import { useForum } from '@/contexts/ForumContext';
import { CommentThread } from '@/components/forum/CommentThread';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { CreatePostModal } from '@/components/forum/CreatePostModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useRouter } from 'next/navigation';

export default function PostDetail({ postId }: { postId: string }) {
    const { post, comments, loading } = useForumPost(postId);
    const { addComment, likePost, incrementView, deletePost } = useForum();
    const { user } = useAuth();
    const router = useRouter();
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [aiReplyLoading, setAiReplyLoading] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const viewIncremented = React.useRef(false);

    React.useEffect(() => {
        if (postId && !viewIncremented.current) {
            incrementView(postId).catch(console.error);
            viewIncremented.current = true;
        }
    }, [postId, incrementView]);

    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [newComment]);

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await addComment(postId, newComment);
            setNewComment("");
        } catch (error) {
            console.error("Error adding comment:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAiReply = async () => {
        if (!post) return;
        setAiReplyLoading(true);
        try {
            const response = await fetch('/api/ai/forum-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postTitle: post.title, postContent: post.content }),
            });
            const data = await response.json();
            if (data.reply) {
                setNewComment(data.reply);
            }
        } catch (error: any) {
            console.error("Error getting AI reply:", error);
            alert("AI Error: " + (error.message || "Failed to get reply"));
        } finally {
            setAiReplyLoading(false);
        }
    };

    const handleSummarize = async () => {
        if (comments.length === 0) return;
        setSummaryLoading(true);
        try {
            const response = await fetch('/api/ai/summarize-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to summarize");
            }

            const data = await response.json();
            if (data.summary) {
                setSummary(data.summary);
            }
        } catch (error: any) {
            console.error("Error summarizing:", error);
            alert("Summary Error: " + (error.message || "Failed to summarize"));
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleDelete = () => {
        setIsDeleteModalOpen(true);
        setShowActions(false);
    };

    const confirmDelete = async () => {
        await deletePost(postId);
        router.push('/forum');
    };

    const handleEdit = () => {
        setIsEditModalOpen(true);
        setShowActions(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen pt-24 px-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Post not found</h1>
                <Link href="/forum" className="text-primary hover:underline">Return to Forum</Link>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#050505] relative overflow-hidden flex flex-col">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 flex flex-col min-h-0">
                <nav className="flex items-center text-sm text-gray-500 mb-8 animate-in fade-in slide-in-from-left-2 duration-500" aria-label="Breadcrumb">
                    <Link href="/forum" className="group flex items-center gap-2 hover:text-white transition-colors">
                        <div className="p-1 rounded-md group-hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span>Back to Discussions</span>
                    </Link>
                </nav>

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-6">
                    {/* Main Discussion Column */}
                    <div className="lg:col-span-8 h-full overflow-y-auto pr-2 pb-20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Main Post Card */}
                        <div className="group relative bg-[#111]/80 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/5">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                            <div className="p-8 relative">
                                {/* Tags & Meta */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex gap-2 flex-wrap">
                                        {post.tags.map(tag => (
                                            <span key={tag} className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-medium tracking-wide">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                                            {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                        </span>

                                        {/* Author Actions */}
                                        {user && post && user.uid === post.authorId && (
                                            <div className="relative z-20">
                                                <button
                                                    onClick={() => setShowActions(!showActions)}
                                                    className="p-1.5 rounded-full bg-black/20 text-gray-400 hover:text-white hover:bg-black/40 transition-colors border border-white/5 backdrop-blur-xl"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {showActions && (
                                                    <div className="absolute right-0 top-full mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 z-50">
                                                        <button
                                                            onClick={handleEdit}
                                                            className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors border-b border-white/5"
                                                        >
                                                            <Edit className="w-4 h-4" /> Edit Post
                                                        </button>
                                                        <button
                                                            onClick={handleDelete}
                                                            className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Delete Post
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Overlay to close menu when clicking outside */}
                                                {showActions && (
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setShowActions(false)}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Title */}
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight tracking-tight">
                                    {post.title}
                                </h1>

                                {/* Author Row */}
                                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
                                    <div className="relative">
                                        {post.authorAvatar ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={post.authorAvatar} alt={post.authorName} className="w-12 h-12 rounded-full ring-2 ring-white/10 bg-gray-800 object-cover" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-gray-300 ring-2 ring-white/10">
                                                <User className="w-6 h-6" />
                                            </div>
                                        )}
                                        {/* Verified/Status badge could go here */}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-100 text-base">{post.authorName}</div>
                                        <div className="text-xs text-indigo-400 font-medium">Community Member</div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="text-gray-300 leading-relaxed text-lg font-light mb-8 [&>p]:mb-6 last:[&>p]:mb-0 [&>strong]:text-white [&>strong]:font-bold [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6">
                                    <ReactMarkdown>{post.content}</ReactMarkdown>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex items-center gap-6 pt-2">
                                    <button
                                        onClick={() => likePost(postId)}
                                        className={`flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all active:scale-95 ${user && post.likedBy?.includes(user.uid)
                                            ? 'bg-primary/20 text-primary ring-1 ring-primary/50'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <ThumbsUp className={`w-5 h-5 ${user && post.likedBy?.includes(user.uid) ? 'fill-current' : ''}`} />
                                        <span className="font-medium">{post.likes}</span>
                                        <span className="sr-only">Likes</span>
                                    </button>

                                    <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 text-gray-400">
                                        <MessageSquare className="w-5 h-5" />
                                        <span className="font-medium">{comments.length}</span>
                                        <span className="text-sm ml-1">Replies</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-4 border-b border-white/5">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    Discussion
                                    <span className="text-sm font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{comments.length}</span>
                                </h3>

                                {comments.length > 0 && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSummarize}
                                            disabled={summaryLoading}
                                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-full"
                                        >
                                            {summaryLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                                            Get Summary
                                        </Button>
                                    </div>
                                )}
                            </div>



                            {/* Reply Input */}
                            <div className="bg-[#111] border border-white/10 rounded-2xl p-1 shadow-lg focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
                                <form onSubmit={handleSubmitComment} className="relative bg-[#0a0a0a] rounded-xl overflow-hidden">
                                    <textarea
                                        ref={textareaRef}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="What are your thoughts?"
                                        disabled={!user}
                                        className="block w-full bg-transparent border-none outline-none focus:ring-0 focus:border-none focus:outline-none shadow-none resize-none min-h-[80px] text-base p-4 text-white placeholder:text-gray-600 appearance-none"
                                    />
                                    <div className="flex justify-between items-center px-4 pb-3 bg-[#0a0a0a]">
                                        <button
                                            type="button"
                                            onClick={handleAiReply}
                                            disabled={aiReplyLoading}
                                            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                                        >
                                            {aiReplyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            AI Suggestion
                                        </button>
                                        <Button
                                            type="submit"
                                            disabled={!user || submitting || !newComment.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-lg font-medium shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                                        >
                                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Reply'}
                                        </Button>
                                    </div>
                                </form>
                            </div>

                            {/* Comments List */}
                            <div className="space-y-6 pb-20">
                                {comments.map((comment, index) => (
                                    <div key={comment.id} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 100}ms` }}>
                                        <CommentThread
                                            postId={postId}
                                            comment={comment}
                                            postAuthorId={post.authorId}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Information */}
                    <div className="lg:col-span-4 h-full overflow-y-auto pl-2 pb-20 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
                        <div className="space-y-6">
                            <div className="bg-[#111]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6 pb-2 border-b border-white/5">
                                    About this discussion
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5 text-gray-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-gray-500 text-xs">Started by</div>
                                            <div className="text-white font-medium text-sm">{post.authorName}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5 text-gray-400">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-gray-500 text-xs">Responses</div>
                                            <div className="text-white font-medium text-sm">{comments.length} replies</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-gray-500 text-xs mb-3">Participants</div>
                                        <div className="flex -space-x-2 pl-2">
                                            {/* Author first */}
                                            {post.authorAvatar ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={post.authorAvatar} alt="" className="relative z-30 inline-block h-9 w-9 rounded-full ring-2 ring-[#111] bg-gray-800 object-cover shadow-lg hover:z-40 transition-all hover:scale-110" />
                                            ) : (
                                                <div className="relative z-30 flex h-9 w-9 rounded-full ring-2 ring-[#111] bg-gray-800 items-center justify-center text-xs text-white shadow-lg hover:z-40 transition-all hover:scale-110">
                                                    {post.authorName[0]}
                                                </div>
                                            )}
                                            {/* Then commenters (unique) */}
                                            {Array.from(new Set(comments.map(c => c.authorAvatar))).filter(a => a !== post.authorAvatar).slice(0, 4).map((avatar, i) => (
                                                avatar ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img key={i} src={avatar} alt="" className={`relative inline-block h-9 w-9 rounded-full ring-2 ring-[#111] bg-gray-800 object-cover shadow-lg hover:z-40 transition-all hover:scale-110`} style={{ zIndex: 20 - i }} />
                                                ) : (
                                                    <div key={i} className={`relative flex h-9 w-9 rounded-full ring-2 ring-[#111] bg-gray-800 items-center justify-center text-xs text-white shadow-lg hover:z-40 transition-all hover:scale-110`} style={{ zIndex: 20 - i }}>
                                                        C
                                                    </div>
                                                )
                                            ))}
                                            {(new Set(comments.map(c => c.authorAvatar)).size > 4) && (
                                                <div className="relative z-10 flex h-9 w-9 rounded-full ring-2 ring-[#111] bg-white/10 items-center justify-center text-[10px] text-white font-medium shadow-lg backdrop-blur-sm">
                                                    +{new Set(comments.map(c => c.authorAvatar)).size - 4}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/20 transition-colors group cursor-help">
                                            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>AI Coach Active</span>
                                            </div>
                                            <p className="text-xs text-indigo-300/60 leading-relaxed">
                                                The AI Coach is monitoring this thread to provide helpful suggestions and summaries.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {summary && (
                                <div className="animate-in fade-in slide-in-from-right-8 duration-700 bg-gradient-to-br from-indigo-900/40 to-[#111] backdrop-blur-xl border border-indigo-500/20 p-6 rounded-2xl relative overflow-hidden shadow-xl">
                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                        <Sparkles className="w-32 h-32 text-indigo-500" />
                                    </div>
                                    <h4 className="text-sm font-bold text-indigo-300 mb-4 flex items-center gap-2 relative z-10 border-b border-indigo-500/20 pb-2">
                                        <Sparkles className="w-4 h-4" /> AI Summary
                                    </h4>
                                    <div className="relative z-10 text-sm text-indigo-100/90 leading-relaxed font-light [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>strong]:text-indigo-300 [&>strong]:font-bold">
                                        <ReactMarkdown>{summary}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Edit Modal */}
            {post && (
                <CreatePostModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    initialData={post}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Post"
                message="Are you sure you want to delete this post? This action cannot be undone."
                confirmText="Delete"
            />
        </div>
    );
}

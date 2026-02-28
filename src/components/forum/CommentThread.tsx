import React, { useState } from 'react';
import { formatForumDate } from '@/lib/utils';
import { MessageSquare, ThumbsUp, User, Reply, Check, Sparkles, Loader2 } from 'lucide-react';
import { Comment, Reply as ReplyType } from '@/types/forum';
import { useAuth } from '@/contexts/AuthContext';
import { useForum } from '@/contexts/ForumContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CommentThreadProps {
    postId: string;
    comment: Comment;
    postAuthorId: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ postId, comment, postAuthorId }) => {
    const { user } = useAuth();
    const { addReply, toggleBestAnswer, likeComment, likeReply } = useForum();
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            alert("Please log in to reply.");
            return;
        }
        if (!replyContent.trim()) return;

        setIsSubmitting(true);
        try {
            await addReply(postId, comment.id, replyContent);
            setReplyContent('');
            setIsReplying(false);
        } catch (error: any) {
            console.error("Failed to replying", error);
            alert("Failed to reply: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBestAnswer = async () => {
        await toggleBestAnswer(postId, comment.id);
    };

    return (
        <div className={`p-4 rounded-lg border transition-all ${comment.isBestAnswer
            ? 'bg-primary/5 border-primary/30'
            : 'bg-[#111] border-white/10 hover:border-white/20'
            }`}>
            {/* Comment Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.authorAvatar || undefined} alt={comment.authorName} className="object-cover" />
                        <AvatarFallback className={`flex items-center justify-center ${comment.isAiGenerated ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400'}`}>
                            {comment.isAiGenerated ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${comment.isAiGenerated ? 'text-primary' : 'text-white'}`}>
                                {comment.authorName}
                            </span>
                            {comment.isAiGenerated && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-medium">
                                    AI
                                </span>
                            )}
                            {comment.isBestAnswer && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 flex items-center gap-1 font-medium">
                                    <Check className="w-3 h-3" /> Best Answer
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-gray-500">
                            {comment.createdAt ? formatForumDate(comment.createdAt.toDate()) : 'Just now'}
                        </span>
                    </div>
                </div>

                {user && user.uid === postAuthorId && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBestAnswer}
                        className={`hover:bg-primary/10 transition-colors h-8 w-8 p-0 ${comment.isBestAnswer ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
                        title="Mark as Best Answer"
                    >
                        <Check className={`w-4 h-4 ${comment.isBestAnswer ? 'fill-current' : ''}`} />
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="pl-11 mb-3 text-sm text-gray-300 leading-relaxed [&>p]:mb-3 last:[&>p]:mb-0 [&>strong]:text-white [&>strong]:font-bold [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4">
                <ReactMarkdown>{comment.content}</ReactMarkdown>
            </div>

            {/* Actions */}
            <div className="pl-11 flex items-center gap-4">
                <button
                    className={`flex items-center gap-1.5 text-xs transition-all hover:bg-white/5 rounded px-2 py-1 -ml-2 ${user && comment.likedBy?.includes(user.uid)
                        ? 'text-primary'
                        : 'text-gray-500 hover:text-white'
                        }`}
                    onClick={() => likeComment(postId, comment.id)}
                >
                    <ThumbsUp className={`w-3.5 h-3.5 ${user && comment.likedBy?.includes(user.uid) ? 'fill-current' : ''}`} />
                    <span>{comment.likes || 0}</span>
                </button>
                <button
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors hover:bg-white/5 rounded px-2 py-1"
                    onClick={() => setIsReplying(!isReplying)}
                >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                </button>
            </div>

            {/* Reply Input */}
            {isReplying && (
                <div className="pl-11 mt-3">
                    <form onSubmit={handleReplySubmit} className="animate-in fade-in slide-in-from-top-1">
                        <div className="flex gap-3 items-start">
                            <textarea
                                value={replyContent}
                                onChange={(e) => {
                                    setReplyContent(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                placeholder="Write a reply..."
                                className="bg-[#1a1a1a] border border-white/10 rounded min-h-[38px] w-full text-sm text-white placeholder:text-gray-500 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none py-2 px-3 overflow-hidden"
                                autoFocus
                                rows={1}
                            />
                            <Button type="submit" size="sm" className="h-[38px] px-4 bg-white/10 hover:bg-white/20 text-white">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reply'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="pl-11 mt-4 space-y-3">
                    {comment.replies.map(reply => (
                        <div key={reply.id} className="pt-3 border-t border-white/5 relative group/reply">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-300">{reply.authorName}</span>
                                <span className="text-[10px] text-gray-600">
                                    {reply.createdAt ? formatForumDate(reply.createdAt.toDate()) : 'Just now'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 mb-2 leading-relaxed [&>p]:mb-2 last:[&>p]:mb-0 [&>strong]:text-gray-300 [&>strong]:font-bold [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4">
                                <ReactMarkdown>{reply.content}</ReactMarkdown>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    className={`flex items-center gap-1 text-[10px] transition-colors ${user && reply.likedBy?.includes(user.uid)
                                        ? 'text-primary'
                                        : 'text-gray-600 hover:text-white'
                                        }`}
                                    onClick={() => likeReply(postId, comment.id, reply.id)}
                                >
                                    <ThumbsUp className={`w-3 h-3 ${user && reply.likedBy?.includes(user.uid) ? 'fill-current' : ''}`} />
                                    <span>{reply.likes || 0}</span>
                                </button>
                                <button
                                    className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-white transition-colors"
                                    onClick={() => {
                                        setIsReplying(true);
                                        setReplyContent(`@${reply.authorName} `);
                                    }}
                                >
                                    <Reply className="w-3 h-3" />
                                    <span>Reply</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

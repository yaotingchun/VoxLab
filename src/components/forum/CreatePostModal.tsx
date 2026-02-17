import React, { useState } from 'react';
import { X, Loader2, Tag, Type, AlignLeft, Sparkles } from 'lucide-react';
import { useForum } from '@/contexts/ForumContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FORUM_categoryGroups } from '@/lib/forum-data';

import { Post } from '@/types/forum';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Post | null;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, initialData }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { createPost, editPost } = useForum();
    const categoryGroups = FORUM_categoryGroups;

    React.useEffect(() => {
        if (isOpen && initialData) {
            setTitle(initialData.title);
            setContent(initialData.content);
            setTags(initialData.tags.join(', '));
        } else if (isOpen && !initialData) {
            setTitle('');
            setContent('');
            setTags('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

            // Add a timeout to prevent infinite loading state
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out. Please check your network connection.")), 15000)
            );

            await Promise.race([
                initialData
                    ? editPost(initialData.id, title, content, tagList)
                    : createPost(title, content, tagList),
                timeoutPromise
            ]);

            onClose();
            setTitle('');
            setContent('');
            setTags('');
        } catch (err: any) {
            console.error("Failed to create post", err);
            setError(err.message || "Failed to create post. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Gradient */}
                <div className="relative p-6 border-b border-white/5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                {initialData ? 'Edit Discussion' : 'Start a Discussion'}
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                {initialData ? 'Update your post details.' : 'Ask a question, share advice, or spark a debate.'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title Input */}
                        <div className="space-y-2 group">
                            <label className="text-sm font-medium text-gray-300 pl-1">Title</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Type className="w-5 h-5" />
                                </div>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="What's on your mind?"
                                    required
                                    className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 rounded-xl transition-all hover:bg-white/10"
                                />
                            </div>
                        </div>

                        {/* Content Input */}
                        <div className="space-y-2 group">
                            <label className="text-sm font-medium text-gray-300 pl-1">Content</label>
                            <div className="relative">
                                <div className="absolute left-4 top-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                                    <AlignLeft className="w-5 h-5" />
                                </div>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Describe your thoughts in detail..."
                                    required
                                    className="w-full min-h-[160px] pl-12 p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all resize-y hover:bg-white/10"
                                />
                            </div>
                        </div>

                        {/* Topic Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300 pl-1 flex items-center justify-between">
                                <span>Select Topics</span>
                                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">Required</span>
                            </label>

                            <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
                                {Object.entries(categoryGroups).map(([group, topics]) => (
                                    <div key={group}>
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 pl-1">{group}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {topics.map(topic => {
                                                const isSelected = tags.includes(topic);
                                                return (
                                                    <button
                                                        key={topic}
                                                        type="button"
                                                        onClick={() => {
                                                            const currentTags = tags ? tags.split(',').map(t => t.trim()) : [];
                                                            let newTags;
                                                            if (isSelected) {
                                                                newTags = currentTags.filter(t => t !== topic);
                                                            } else {
                                                                newTags = [...currentTags, topic];
                                                            }
                                                            setTags(newTags.join(', '));
                                                        }}
                                                        className={`text-xs font-medium px-4 py-2 rounded-lg border transition-all duration-200 ${isSelected
                                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/40'
                                                            : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:bg-white/5 hover:border-white/10 hover:text-gray-200'
                                                            }`}
                                                    >
                                                        {topic}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/5 mt-8">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="h-11 px-6 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-11 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {initialData ? 'Saving...' : 'Publishing...'}
                                    </>
                                ) : (
                                    initialData ? 'Save Changes' : 'Publish Discussion'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, Share2, Type, AlignLeft, Video as VideoIcon, Trash2 } from 'lucide-react';
import { useForum } from '@/contexts/ForumContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FORUM_categoryGroups } from '@/lib/forum-data';

interface ShareSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionData: {
        summary: string;
        tips: string[];
        score?: number;
        vocalSummary?: { summary: string; tips: string[], score?: number } | null;
        postureSummary?: { summary: string; tips: string[], score?: number } | null;
        videoUrl?: string | null;
        rawMetrics?: {
            duration: number;
            wpm: number;
            transcript?: string;
        };
    };
}

export const ShareSessionModal: React.FC<ShareSessionModalProps> = ({ isOpen, onClose, sessionData }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { createPost } = useForum();
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            // Default Title
            const dateStr = new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            setTitle(`Practice Session - ${dateStr}`);

            // Pre-fill Content with a nicely formatted report
            let initialContent = `## 📊 Session Executive Summary\n\n${sessionData.summary}\n\n`;

            if (sessionData.score !== undefined) {
                initialContent += `**Overall Score:** ${sessionData.score}/100\n\n`;
            }

            if (sessionData.tips.length > 0) {
                initialContent += `### 💡 AI Coach Recommendations\n`;
                sessionData.tips.forEach(tip => {
                    initialContent += `- ${tip}\n`;
                });
                initialContent += `\n`;
            }

            if (sessionData.vocalSummary) {
                initialContent += `### 🎤 Vocal Analysis\n${sessionData.vocalSummary.summary}\n\n`;
            }

            if (sessionData.postureSummary) {
                initialContent += `### 🧍 Body Language\n${sessionData.postureSummary.summary}\n\n`;
            }


            setContent(initialContent);

            // Logic to pre-select tags based on session data
            const initialTags: string[] = ['Presentation']; // Default
            if (sessionData.rawMetrics?.wpm) initialTags.push('Pause Control');
            if (sessionData.postureSummary) initialTags.push('Posture');
            setTags(initialTags);
        }
    }, [isOpen, sessionData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("You must be logged in to share.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Create the post on the forum
            await createPost(
                title,
                content,
                tags,
                sessionData.videoUrl ? [sessionData.videoUrl] : [],
                sessionData.videoUrl ? 'video' : undefined
            );

            onClose();
        } catch (err: any) {
            console.error("Failed to share session", err);
            setError(err.message || "Failed to publish post. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div
                className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a] z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Share2 className="w-6 h-6 text-indigo-400" />
                            Share Session to Forum
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Get feedback from the community on your performance.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form id="share-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Type className="w-4 h-4 text-indigo-400" /> Post Title
                            </label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a title for your post..."
                                required
                                className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-indigo-500/50 rounded-2xl"
                            />
                        </div>

                        {/* Content */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <AlignLeft className="w-4 h-4 text-indigo-400" /> Description & Summary
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Add your thoughts or questions for the community..."
                                required
                                className="w-full min-h-[300px] p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all resize-y text-base font-mono leading-relaxed"
                            />
                        </div>

                        {/* Video Preview (if exists) */}
                        {sessionData.videoUrl && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <VideoIcon className="w-4 h-4 text-indigo-400" /> Attached Video
                                </label>
                                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video relative max-w-sm">
                                    <video src={sessionData.videoUrl} className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Topics */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-400 flex items-center justify-between">
                                <span>Select Community Topics</span>
                                <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full border border-indigo-400/20 uppercase tracking-widest font-bold">Helpful for categorization</span>
                            </label>
                            <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-4">
                                {Object.entries(FORUM_categoryGroups).map(([group, topics]) => (
                                    <div key={group}>
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 pl-1">{group}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {topics.map(topic => {
                                                const isSelected = tags.includes(topic);
                                                return (
                                                    <button
                                                        key={topic}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setTags(tags.filter(t => t !== topic));
                                                            } else {
                                                                setTags([...tags, topic]);
                                                            }
                                                        }}
                                                        className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all duration-200 ${isSelected
                                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
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
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 bg-[#0a0a0a]">
                    <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:bg-white/5 rounded-xl px-6">
                        Cancel
                    </Button>
                    <Button
                        form="share-form"
                        type="submit"
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 shadow-lg shadow-indigo-600/20 min-w-[140px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sharing...
                            </>
                        ) : (
                            <>
                                <Share2 className="mr-2 h-4 w-4" />
                                Publish to Forum
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

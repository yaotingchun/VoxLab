import React, { useState, useRef } from 'react';
import { X, Loader2, Tag, Type, AlignLeft, Sparkles, Image as ImageIcon, Video as VideoIcon, Upload, Trash2 } from 'lucide-react';
import { useForum } from '@/contexts/ForumContext';
import { useAuth } from '@/contexts/AuthContext';
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
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { createPost, editPost } = useForum();
    const { user } = useAuth();
    const categoryGroups = FORUM_categoryGroups;
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen && initialData) {
            setTitle(initialData.title);
            setContent(initialData.content);
            setTags(initialData.tags.join(', '));
            if (initialData.mediaUrls && initialData.mediaUrls.length > 0) {
                setMediaPreview(initialData.mediaUrls[0]);
                setMediaType(initialData.mediaType || 'image');
            }
        } else if (isOpen && !initialData) {
            setTitle('');
            setContent('');
            setTags('');
            setMediaFile(null);
            setMediaPreview(null);
            setMediaType(null);
            setUploadProgress(0);
        }
    }, [isOpen, initialData]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type and size (e.g., max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            setError("File size too large (max 50MB)");
            return;
        }

        const type = file.type.startsWith('video/') ? 'video' : 'image';
        setMediaType(type);
        setMediaFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setMediaType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
            let finalMediaUrl = initialData?.mediaUrls?.[0];

            // Upload Media if exists and in File mode
            if (mediaFile && user) {
                // GCS Upload
                const signRes = await fetch('/api/upload/sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: mediaFile.name,
                        contentType: mediaFile.type
                    })
                });

                if (!signRes.ok) {
                    throw new Error('Failed to initiate upload');
                }

                const { uploadUrl, publicUrl } = await signRes.json();

                console.log('GCS Upload Starting:', { uploadUrl, publicUrl });

                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl, true);
                    xhr.setRequestHeader('Content-Type', mediaFile.type);

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            setUploadProgress((e.loaded / e.total) * 100);
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            console.log('GCS Upload Success:', xhr.status);
                            resolve();
                        } else {
                            console.error('GCS Upload Failed:', xhr.status, xhr.responseText);
                            reject(new Error(`Upload failed with status ${xhr.status}`)); // Show status in UI
                        }
                    };

                    xhr.onerror = () => {
                        console.error('GCS Network Error', xhr);
                        reject(new Error('Network error during upload'));
                    }
                    xhr.send(mediaFile);
                });

                finalMediaUrl = publicUrl;
            }

            // Detect type for URL if not set
            let finalMediaType = mediaType;

            const mediaUrls = finalMediaUrl ? [finalMediaUrl] : undefined;

            if (initialData) {
                await editPost(initialData.id, title, content, tagList, mediaUrls, finalMediaType || undefined);
            } else {
                await createPost(title, content, tagList, mediaUrls, finalMediaType || undefined);
            }

            onClose();
            // Reset form
            setTitle('');
            setContent('');
            setTags('');
            setMediaFile(null);
            setMediaPreview(null);

            setMediaType(null);
            setUploadProgress(0);

        } catch (err: any) {
            console.error("Failed to submit post", err);
            setError(err.message || "Failed to submit post. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Gradient */}
                <div className="relative p-6 border-b border-white/5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
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
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                    <Type className="w-5 h-5" />
                                </div>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="What's on your mind?"
                                    required
                                    className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-2xl transition-all hover:bg-white/10 text-lg font-medium"
                                />
                            </div>
                        </div>

                        {/* Content Input */}
                        <div className="space-y-2 group">
                            <label className="text-sm font-medium text-gray-300 pl-1">Content</label>
                            <div className="relative">
                                <div className="absolute left-4 top-4 text-gray-500 group-focus-within:text-primary transition-colors">
                                    <AlignLeft className="w-5 h-5" />
                                </div>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Describe your thoughts in detail..."
                                    required
                                    className="w-full min-h-[160px] pl-12 p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-y hover:bg-white/10 text-base"
                                />
                            </div>
                        </div>

                        {/* Media Upload Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300 pl-1">Media</label>
                            </div>

                            {!mediaPreview ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all group/upload"
                                >
                                    <div className="p-4 rounded-full bg-white/5 group-hover/upload:bg-primary/20 text-gray-400 group-hover/upload:text-primary mb-3 transition-colors">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm text-gray-300 font-medium">Click to upload image or video</p>
                                    <p className="text-xs text-gray-500 mt-1">MP4, PNG, JPG up to 50MB</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="image/*,video/*"
                                    />
                                </div>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 group/preview">
                                    {mediaType === 'video' ? (
                                        <video src={mediaPreview} controls className="w-full max-h-[300px] object-contain" />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={mediaPreview} alt="Preview" className="w-full max-h-[300px] object-contain" />
                                    )}

                                    <button
                                        type="button"
                                        onClick={removeMedia}
                                        className="absolute top-2 right-2 p-2 rounded-full bg-black/60 hover:bg-red-500/80 text-white transition-colors backdrop-blur-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    {loading && uploadProgress > 0 && uploadProgress < 100 && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center flex-col">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                                            <span className="text-white font-medium">{Math.round(uploadProgress)}% Uploading...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Topic Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300 pl-1 flex items-center justify-between">
                                <span>Select Topics</span>
                                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Required</span>
                            </label>

                            <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-5">
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
                                                        className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all duration-200 ${isSelected
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/40 transform scale-105'
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
                                className="h-12 px-6 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-12 px-8 rounded-xl bg-white text-black hover:bg-gray-200 font-bold shadow-lg shadow-white/5 transition-all hover:scale-[1.02]"
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
            </div >
        </div >
    );
};

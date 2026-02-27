'use client';

import { useChat } from '@ai-sdk/react';
import { Button } from "@/components/ui/button";
import { Send, User, Mic, FileText, Sparkles, Home, ArrowLeft } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Logo } from '@/components/ui/logo';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/components/ui/UserProfile';

export default function CoachPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [input, setInput] = useState('');
    const [scriptInput, setScriptInput] = useState('');
    const { messages, status, sendMessage } = useChat({
        onError: (error) => {
            console.error("Chat error:", error);
            alert("Failed to send message: " + error.message);
        }
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Optimistically clear input
        const currentInput = input;
        setInput('');

        try {
            await sendMessage({ role: 'user', content: currentInput } as any);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Restore input on failure if needed, or just show error
            // For now, we rely on the chat error state
        }
    };

    const handleAnalyzeScript = async () => {
        if (!scriptInput.trim()) return;

        await sendMessage({
            role: 'user',
            content: `Please analyze the following script for breathlessness, transitions, and jargon. Provide 3 specific improvements:\n\n"${scriptInput}"`
        } as any);
    };

    const handleGenerateWarmup = async () => {
        if (!scriptInput.trim()) return;

        await sendMessage({
            role: 'user',
            content: `Generate a personalized vocal warm-up and tongue twisters based on the vocabulary and difficult words in this script:\n\n"${scriptInput}"`
        } as any);
    };

    return (
        <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-transparent text-white selection:bg-primary/30 relative">

            {/* Header */}
            <header className="relative z-50 w-full bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-white hover:text-white hover:bg-white/10 transition-all rounded-xl bg-white/5 border border-white/10"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <Logo size="sm" className="opacity-80" />
                        <div className="h-4 w-[1px] bg-white/10" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">AI Coach</span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-8">
                        <nav className="hidden lg:flex items-center gap-8 text-sm font-bold tracking-tight">
                            <button
                                onClick={() => router.push('/dashboard/mode')}
                                className="text-slate-400 hover:text-primary transition-all flex items-center gap-2 group"
                            >
                                Mode
                            </button>
                            <button
                                onClick={() => router.push('/forum')}
                                className="text-slate-400 hover:text-white transition-all flex items-center gap-2"
                            >
                                Forum
                            </button>
                        </nav>

                        <div className="h-8 w-px bg-white/10" />

                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/dashboard')}
                                className="text-slate-400 hover:text-white transition-all rounded-xl"
                            >
                                <Home className="w-5 h-5" />
                            </Button>
                            <NotificationDropdown />
                            {user && <UserProfile displayName={user.displayName || user.email?.split("@")[0] || "User"} />}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area - Split View */}
                <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">

                    {/* Script Input Area (Left Panel) */}
                    <div className="flex-1 border-r border-white/5 p-6 flex flex-col gap-4 overflow-y-auto">
                        <div className="flex items-center gap-2 text-primary">
                            <FileText className="w-5 h-5" />
                            <h2 className="font-semibold">Your Speech Script</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Paste your script here to give the AI context. You can refer to specific parts in the chat.
                        </p>
                        <textarea
                            className="flex-1 w-full bg-surface/30 border border-white/10 rounded-xl p-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Paste your speech script here..."
                            value={scriptInput}
                            onChange={(e) => setScriptInput(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button
                                className="flex-1 bg-secondary hover:bg-secondary/90 text-white"
                                onClick={handleAnalyzeScript}
                                disabled={isLoading || !scriptInput.trim()}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Analyze Script
                            </Button>
                            <Button
                                className="flex-1 bg-accent hover:bg-accent/90 text-white"
                                onClick={handleGenerateWarmup}
                                disabled={isLoading || !scriptInput.trim()}
                            >
                                <Mic className="w-4 h-4 mr-2" />
                                Vocal Warm-up
                            </Button>
                        </div>
                    </div>

                    {/* Chat Interface (Right Panel) */}
                    <div className="flex-1 flex flex-col bg-background/50">
                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-bold tracking-tight">Ready to Coach</p>
                                        <p className="text-sm text-slate-400">Ask for feedback, improvements, or practice tips.</p>
                                    </div>
                                </div>
                            )}

                            {messages.map((m: any) => (
                                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {m.role !== 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] rounded-2xl p-4 ${m.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                        : 'bg-surface border border-white/5 rounded-tl-sm'
                                        }`}>
                                        <div className="text-sm prose prose-invert max-w-none">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                                    h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                                                    strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/30 pl-4 italic my-2">{children}</blockquote>,
                                                }}
                                            >
                                                {m.content || (m.parts && m.parts.map((p: any) => p.type === 'text' ? p.text : '').join(''))}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                    {m.role === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 animate-pulse">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="bg-surface border border-white/5 rounded-2xl rounded-tl-sm p-4">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Configure Chat Input */}
                        <div className="p-4 border-t border-white/5 bg-surface/30 backdrop-blur-sm">
                            <form onSubmit={handleFormSubmit} className="relative flex items-center">
                                <input
                                    className="w-full bg-surface/50 border border-white/10 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
                                    value={input}
                                    placeholder="Ask your coach..."
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="absolute right-1.5 rounded-full w-9 h-9"
                                    disabled={isLoading || !input.trim()}
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

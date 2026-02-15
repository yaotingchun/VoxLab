'use client';

import { useChat } from '@ai-sdk/react';
import { Button } from "@/components/ui/button";
import { Send, User, Mic, FileText, Sparkles } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

export default function CoachPage() {
    const [input, setInput] = useState('');
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

    return (
        <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background text-foreground">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-tr from-primary to-secondary rounded-lg flex items-center justify-center">
                        <Sparkles className="text-white w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold">AI Coach Session</h1>
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
                        />
                    </div>

                    {/* Chat Interface (Right Panel) */}
                    <div className="flex-1 flex flex-col bg-background/50">
                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Mic className="w-8 h-8 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium">Ready to Coach</p>
                                        <p className="text-sm">Ask for feedback, improvements, or practice tips.</p>
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
                                        <p className="text-sm whitespace-pre-wrap">
                                            {m.content || (m.parts && m.parts.map((p: any) => p.type === 'text' ? p.text : '').join(''))}
                                        </p>
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

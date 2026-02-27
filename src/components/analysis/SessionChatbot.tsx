"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageCircle, X, Send, User, Bot, Sparkles, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface SessionChatbotProps {
    reportData: any; // The full session summary object
}

export function SessionChatbot({ reportData }: SessionChatbotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, status, sendMessage } = useChat({
        api: "/api/ai/session-chat",
        onError: (error: Error) => console.error("Chat error:", error)
    } as any);

    const isLoading = status === 'submitted' || status === 'streaming';

    // Auto scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isOpen, isExpanded]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const currentInput = input;
        setInput("");

        try {
            // We append a compressed, hidden block of data at the end of the user string so that 
            // the server can parse it without relying on specific `useChat` payload features.
            const payload = `${currentInput}\n\n<REPORT_DATA_JSON>${JSON.stringify(reportData)}</REPORT_DATA_JSON>`;

            await sendMessage({
                role: 'user',
                content: payload
            } as any);
        } catch (error) {
            console.error(error);
        }
    };

    const renderMessageContent = (message: any) => {
        let content = message.content || (message.parts && message.parts.map((p: any) => p.type === 'text' ? p.text : '').join('')) || '';
        if (message.role === 'user') {
            content = content.replace(/<REPORT_DATA_JSON>[\s\S]*?<\/REPORT_DATA_JSON>/g, '').trim();
        }
        return content;
    };

    return (
        <>
            {/* Floating Action Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] flex items-center justify-center text-white z-[70] transition-all duration-300 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
            >
                <Bot className="w-6 h-6" />
                <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-[#020202] animate-pulse" />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`fixed ${isExpanded ? 'inset-4 md:inset-10' : 'bottom-6 right-6 w-[calc(100vw-48px)] md:w-[420px] h-[600px] max-h-[calc(100vh-48px)]'} bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] rounded-[2rem] flex flex-col z-[100] overflow-hidden transition-all duration-300`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 bg-white/[0.02] border-b border-white/5 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/30">
                                    <Bot className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-sm font-bold text-white tracking-tight">AI Coach</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                    title={isExpanded ? "Minimize" : "Maximize"}
                                >
                                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/20 text-slate-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar scroll-smooth">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                                    <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
                                        <Bot className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white mb-1">How can I help?</p>
                                        <p className="text-xs text-slate-400 max-w-[250px]">Ask me anything about your session scorecard, pacing, or performance.</p>
                                    </div>
                                </div>
                            )}

                            {messages.map((message) => {
                                const isUser = message.role === "user";
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={message.id}
                                        className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}
                                    >
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center shadow-lg ${isUser ? "bg-white/10 border border-white/20" : "bg-gradient-to-r from-primary to-secondary"}`}>
                                            {isUser ? (
                                                <User className="w-4 h-4 text-white" />
                                            ) : (
                                                <Bot className="w-4 h-4 text-white" />
                                            )}
                                        </div>

                                        {/* Bubble */}
                                        <div
                                            className={`rounded-[1.5rem] px-4 py-3 text-sm leading-relaxed shadow-lg ${isUser
                                                ? "bg-primary text-white rounded-tr-md"
                                                : "bg-[#111] border border-white/10 text-slate-200 rounded-tl-md prose prose-invert prose-p:leading-snug prose-sm max-w-none"
                                                }`}
                                        >
                                            <ReactMarkdown>
                                                {renderMessageContent(message)}
                                            </ReactMarkdown>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3 max-w-[85%]"
                                >
                                    <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-lg">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="bg-[#111] border border-white/10 rounded-[1.5rem] rounded-tl-md px-4 py-3 flex items-center gap-1.5 h-[48px]">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} className="h-2" />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleFormSubmit} className="p-4 bg-white/[0.02] border-t border-white/5 shrink-0">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="w-full bg-[#111] border border-white/10 text-white rounded-full pl-5 pr-14 py-3.5 text-sm focus:outline-none focus:border-primary/50 focus:bg-[#1a1a1a] placeholder:text-slate-500 transition-all shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-1.5 w-10 h-10 flex items-center justify-center bg-primary hover:bg-primary/80 disabled:bg-white/5 disabled:text-slate-500 disabled:border disabled:border-white/10 disabled:cursor-not-allowed rounded-full text-white transition-all shadow-lg"
                                >
                                    <Send className="w-4 h-4 translate-x-[1px] translate-y-[1px]" />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

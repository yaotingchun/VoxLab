"use client";

import { useState } from "react";
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

    const { messages, status, sendMessage } = useChat({
        api: "/api/ai/session-chat", // Note: The old version might ignore this if it defaults to /api/chat. Let's send to /api/ai/session-chat
        onError: (error) => console.error("Chat error:", error)
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim()) return;

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
                className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white z-[70] ${isOpen ? 'hidden' : 'block'}`}
            >
                <MessageCircle className="w-6 h-6" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900" />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`fixed bottom-6 right-6 ${isExpanded ? 'w-[800px] h-[800px]' : 'w-[400px] h-[600px]'} max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl flex flex-col z-[80] overflow-hidden transition-all duration-300 ease-in-out`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">AI Session Coach</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] text-slate-400 font-medium">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                                >
                                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${message.role === "user" ? "bg-slate-700" : "bg-gradient-to-r from-blue-500 to-purple-500"}`}>
                                        {message.role === "user" ? (
                                            <User className="w-4 h-4 text-slate-300" />
                                        ) : (
                                            <Bot className="w-4 h-4 text-white" />
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div
                                        className={`rounded-2xl p-3 text-[13px] leading-relaxed shadow-sm ${message.role === "user"
                                            ? "bg-blue-600 text-white rounded-tr-sm"
                                            : "bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-sm prose prose-invert prose-p:leading-snug prose-sm max-w-none"
                                            }`}
                                    >
                                        <ReactMarkdown>
                                            {renderMessageContent(message)}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 max-w-[85%]">
                                    <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm p-3 flex items-center gap-1.5 h-[42px]">
                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleFormSubmit} className="p-4 bg-slate-900 border-t border-slate-800">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about your report..."
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-500 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-1.5 w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-full text-white transition-colors"
                                >
                                    <Send className="w-4 h-4 translate-x-[1px]" />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

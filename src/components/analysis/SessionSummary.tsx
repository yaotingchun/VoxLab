"use client";

import { motion } from "framer-motion";

interface SessionSummaryProps {
    data: {
        summary: string;
        tips: string[];
    };
    onClose?: () => void;
}

export function SessionSummary({ data, onClose }: SessionSummaryProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-blue-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
        >
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Gemini AI Coach
                    </h3>
                    <span className="bg-blue-600/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-400/50">
                        PRO
                    </span>
                </div>

                <div className="pl-4 border-l-2 border-blue-500/50 mb-6">
                    <p className="text-slate-300 italic text-sm leading-relaxed">
                        "{data.summary}"
                    </p>
                </div>

                <div className="space-y-3">
                    <h4 className="text-yellow-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <span>💡</span> Quick Tips
                    </h4>
                    <ul className="space-y-2">
                        {data.tips.map((tip, index) => (
                            <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-lg transition-colors"
                    >
                        Close Analysis
                    </button>
                )}
            </div>
        </motion.div>
    );
}

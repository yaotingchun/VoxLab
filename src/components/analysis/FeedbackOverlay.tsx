"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackOverlayProps {
    isNervous: boolean;
    isDistracted: boolean;
    emotionState: string;
    postureMessages: string[];
}

export function FeedbackOverlay({ isNervous, isDistracted, emotionState, postureMessages }: FeedbackOverlayProps) {
    // Intervention Logic
    const [interventionState, setInterventionState] = React.useState<'idle' | 'prompt' | 'active' | 'dismissed'>('idle');

    // Reset logic: If nervousness clears, we reset to idle so it can trigger again later.
    React.useEffect(() => {
        if (!isNervous) {
            setInterventionState('idle');
        } else if (isNervous && interventionState === 'idle') {
            setInterventionState('prompt');
        }
    }, [isNervous, interventionState]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AnimatePresence>
                {/* 1. INTERACTIVE PROMPT: Only show when Nervous + Prompt state */}
                {interventionState === 'prompt' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute top-1/3 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto"
                    >
                        <div className="bg-slate-900/95 backdrop-blur-md border border-blue-500/50 p-6 rounded-2xl shadow-2xl text-center max-w-sm">
                            <div className="text-3xl mb-2">😰</div>
                            <h3 className="text-white font-bold text-lg mb-1">Feeling Nervous?</h3>
                            <p className="text-slate-400 text-sm mb-4">We detected high tension. Would you like a quick breathing guide?</p>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setInterventionState('active')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                >
                                    Yes, Help Me
                                </button>
                                <button
                                    onClick={() => setInterventionState('dismissed')}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                >
                                    No, I'm Good
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 2. BREATHING GUIDE: Only show if user said YES ('active') */}
                {interventionState === 'active' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: 1,
                            scale: [1, 1.2, 1],
                            borderColor: ["rgba(59, 130, 246, 0.5)", "rgba(59, 130, 246, 0.2)", "rgba(59, 130, 246, 0.5)"]
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute inset-0 border-8 border-blue-400/30 rounded-full m-12 flex items-center justify-center pointer-events-auto"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="bg-blue-900/80 text-blue-200 px-6 py-3 rounded-full text-xl font-semibold backdrop-blur-sm">
                                Breathe In... 🌬️
                            </div>
                            <button
                                onClick={() => setInterventionState('dismissed')}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs transition-colors"
                            >
                                Stop Guide
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Distraction: Eye Contact Target */}
                {isDistracted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    >
                        <div className="w-16 h-16 border-4 border-red-500 rounded-full animate-ping absolute"></div>
                        <div className="w-4 h-4 bg-red-500 rounded-full relative z-10"></div>
                        <div className="mt-8 bg-red-900/80 text-white px-3 py-1 rounded text-xs whitespace-nowrap -translate-x-1/2 left-1/2 absolute">
                            Look Here
                        </div>
                    </motion.div>
                )}

                {/* Smile Prompt (If stable but low engagement) */}
                {emotionState === 'neutral' && !isNervous && !isDistracted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-24 left-1/2 transform -translate-x-1/2"
                    >
                        <div className="bg-white/10 text-white/50 px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                            Try Smiling 😊
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ZONE 2: Posture Alerts (Top Center - Moved from bottom to clear controls) */}
            <div className="absolute top-8 left-0 right-0 flex flex-col items-center space-y-2 pointer-events-none z-50">
                <AnimatePresence>
                    {postureMessages.slice(0, 1).map((msg, idx) => (
                        <motion.div
                            key={`posture-${msg}-${idx}`}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="bg-red-950/80 backdrop-blur-md text-red-100 px-4 py-2 rounded-full text-sm font-semibold border border-red-500/50 shadow-xl flex items-center gap-2"
                        >
                            <span className="text-red-400">⚠️</span> {msg}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Emotion Indicator (Subtle) */}
            {emotionState !== 'neutral' && (
                <div className="absolute top-4 right-4 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs text-white border border-white/20">
                    Expression: <span className="uppercase font-bold text-yellow-300">{emotionState}</span>
                </div>
            )}
        </div>
    );
}

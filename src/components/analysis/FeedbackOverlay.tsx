"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackOverlayProps {
    isNervous: boolean;
    isDistracted: boolean;
    emotionState: string;
    postureMessages: string[];
    faceMessages: string[];
}

export function FeedbackOverlay({ isNervous, isDistracted, emotionState, postureMessages, faceMessages }: FeedbackOverlayProps) {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AnimatePresence>
                {/* Nervousness: Breathing Guide (General) */}
                {isNervous && !faceMessages.includes("Relax your jaw/mouth. 👄") && (
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
                        className="absolute inset-0 border-8 border-blue-400/30 rounded-full m-12 flex items-center justify-center"
                    >
                        <div className="bg-blue-900/80 text-blue-200 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm">
                            Breathe... In... Out...
                        </div>
                    </motion.div>
                )}

                {/* Specific Mouth Tension Guide */}
                {faceMessages.some(m => m.includes("Relax your jaw")) && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2"
                    >
                        <div className="bg-yellow-900/80 text-yellow-200 px-6 py-2 rounded-full text-sm font-bold backdrop-blur-sm border border-yellow-500/50 flex items-center gap-2">
                            <span>👄</span> Relax Mouth
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

            {/* ZONE 1: Facial Feedback (Top Right Corner) */}
            <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 max-w-[250px]">
                <AnimatePresence>
                    {faceMessages.slice(0, 3).map((msg, idx) => (
                        <motion.div
                            key={`face-${msg}-${idx}`}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            className="bg-black/60 backdrop-blur-md text-white px-3 py-2 rounded-lg text-xs border-r-4 border-blue-400 shadow-lg text-right"
                        >
                            {msg}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ZONE 2: Posture Alerts (Bottom Center - Raised above controls) */}
            <div className="absolute bottom-32 left-4 right-4 flex flex-col items-center space-y-2 pointer-events-none">
                <AnimatePresence>
                    {postureMessages.slice(0, 1).map((msg, idx) => (
                        <motion.div
                            key={`posture-${msg}-${idx}`}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="bg-red-900/80 backdrop-blur-md text-white px-6 py-3 rounded-xl text-lg font-bold border-2 border-red-500 shadow-2xl text-center"
                        >
                            ⚠️ {msg}
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

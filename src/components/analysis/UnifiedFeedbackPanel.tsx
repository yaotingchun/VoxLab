"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, Music, Activity, User, ChevronDown, ChevronUp } from "lucide-react";
import type { PostureIssue } from "@/hooks/usePostureAnalysis";
import { useState } from "react";

interface UnifiedFeedbackPanelProps {
    // Vocal Props
    pitch: number;
    wpm: number;
    volume: number;
    isListening: boolean;
    // Posture Props
    postureScore: number;
    isPostureStable: boolean;
    postureIssues: PostureIssue[];
}

// --- Posture Correction Animations (Copied from FeedbackPanel for self-containment) ---

const HeadTiltAnimation = () => (
    <div className="flex flex-col items-center">
        <div className="relative w-24 h-24 mb-1 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" fill="#1e293b" opacity="0.5" />
                <motion.g transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}>
                    <path d="M20 90 Q50 90 80 90 L80 100 L20 100 Z" fill="#334155" />
                    <motion.g initial={{ rotate: -15, transformOrigin: "50px 80px" }} animate={{ rotate: 0 }} transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}>
                        <rect x="42" y="60" width="16" height="25" fill="#94a3b8" rx="4" />
                        <ellipse cx="50" cy="45" rx="18" ry="22" fill="#cbd5e1" />
                    </motion.g>
                </motion.g>
            </svg>
        </div>
        <p className="text-[10px] text-blue-300">Align Head</p>
    </div>
);

const ShoulderAlignAnimation = () => (
    <div className="flex flex-col items-center">
        <div className="relative w-24 h-24 mb-1 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" fill="#1e293b" opacity="0.5" />
                <motion.g initial={{ rotate: 10, transformOrigin: "50px 80px" }} animate={{ rotate: 0 }} transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}>
                    <path d="M20 60 Q50 50 80 60 L80 100 L20 100 Z" fill="#94a3b8" />
                    <rect x="42" y="45" width="16" height="20" fill="#94a3b8" />
                    <circle cx="50" cy="35" r="16" fill="#cbd5e1" />
                </motion.g>
            </svg>
        </div>
        <p className="text-[10px] text-blue-300">Level Shoulders</p>
    </div>
);

const SlouchAnimation = () => (
    <div className="flex flex-col items-center">
        <div className="relative w-24 h-24 mb-1 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" fill="#1e293b" opacity="0.5" />
                <motion.path
                    d="M40 90 Q 25 60 55 40 L 55 25"
                    animate={{ d: "M40 90 Q 40 60 40 40 L 40 25" }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    stroke="#cbd5e1" strokeWidth="12" strokeLinecap="round" fill="none"
                />
                <motion.circle cx="55" cy="25" r="14" fill="#cbd5e1" initial={{ cx: 55, cy: 30 }} animate={{ cx: 40, cy: 20 }} transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }} />
            </svg>
        </div>
        <p className="text-[10px] text-blue-300">Straighten Back</p>
    </div>
);

const MovementAnimation = () => (
    <div className="flex flex-col items-center">
        <div className="relative w-24 h-24 mb-1 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" fill="#1e293b" opacity="0.5" />
                <motion.g animate={{ x: [-2, 2, -1, 1, 0], y: [1, -1, 2, -2, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
                    <path d="M30 100 L35 60 Q50 50 65 60 L70 100 Z" fill="#94a3b8" opacity="0.8" />
                    <circle cx="50" cy="40" r="15" fill="#cbd5e1" opacity="0.8" />
                </motion.g>
            </svg>
        </div>
        <p className="text-[10px] text-blue-300">Stay Still</p>
    </div>
);

export function UnifiedFeedbackPanel({
    pitch, wpm, volume, isListening,
    postureScore, isPostureStable, postureIssues
}: UnifiedFeedbackPanelProps) {
    const [isPostureExpanded, setIsPostureExpanded] = useState(true);

    const getPitchColor = (p: number) => {
        if (p === 0) return "text-slate-500";
        return "text-white"; // neutralized color
    };

    const isVocalActive = isListening && volume > 0.01;
    const displayedIssues = postureIssues.slice(0, 2);
    const uniqueIssueTypes = Array.from(new Set(displayedIssues.map(i => i.type)));

    return (
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-black/40 flex flex-col overflow-hidden h-full">
            {/* --- TOP SECTION: VOCAL ANALYSIS --- */}
            <div className="p-6 pb-4 bg-white/[0.02]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Mic className="w-4 h-4 text-slate-300" />
                        </div>
                        Vocal Analysis
                    </h2>
                    {isListening && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/10 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Live</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Pitch */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                            <Music className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Pitch</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-bold font-mono ${getPitchColor(pitch)}`}>
                                {pitch > 0 ? Math.round(pitch) : "--"}
                            </span>
                            <span className="text-slate-600 text-[10px] font-bold">Hz</span>
                        </div>
                        <div className="mt-3 flex gap-0.5 h-1 items-end">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="flex-1 bg-slate-700/50 rounded-full"
                                    animate={{ height: isVocalActive ? `${20 + Math.random() * 80}%` : "10%" }}
                                    transition={{ duration: 0.2, repeat: Infinity, repeatType: "reverse" }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Pace */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-2 text-slate-500">
                            <Activity className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Pace</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold font-mono text-white tracking-tighter">
                                {wpm}
                            </span>
                            <span className="text-slate-600 text-[10px] font-bold">WPM</span>
                        </div>
                        <div className="mt-3 text-[10px] font-medium text-slate-600">
                            Target: 130-160
                        </div>
                    </div>
                </div>

                {/* Vocal Tip */}
                {pitch > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-[11px] text-slate-500 italic text-center"
                    >
                        {pitch < 120 ? "Projecting from your chest adds authority." : "A varied pitch keeps your audience engaged."}
                    </motion.div>
                )}
            </div>

            {/* --- DIVIDER --- */}
            <div className="px-6">
                <div className="h-px bg-white/10" />
            </div>

            {/* --- BOTTOM SECTION: POSTURE ANALYSIS --- */}
            <div className="p-6 pt-4 flex-1 flex flex-col bg-white/[0.02]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <User className="w-4 h-4 text-slate-300" />
                        </div>
                        Posture Analysis
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter leading-none">Stability</span>
                            <span className={`text-xl font-bold font-mono ${postureScore >= 80 ? 'text-green-500' : postureScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {Math.round(postureScore)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="space-y-3 mb-6">
                        <AnimatePresence mode="popLayout">
                            {displayedIssues.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="flex items-center text-green-400 bg-green-500/5 p-3 rounded-xl border border-green-500/20 text-sm"
                                >
                                    <span className="mr-2">✨</span> Great posture! Keep it up.
                                </motion.div>
                            ) : (
                                displayedIssues.map((item, index) => (
                                    <motion.div
                                        key={`${item.type}-${index}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="flex items-center p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-300 text-sm"
                                    >
                                        <span className="mr-2">⚠️</span> {item.message}
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Correction Mini-Guide */}
                    {uniqueIssueTypes.length > 0 && (
                        <div className="mt-auto grid grid-cols-2 gap-2 p-3 bg-white/5 rounded-2xl border border-white/10">
                            {uniqueIssueTypes.map((type) => (
                                <div key={type} className="flex justify-center flex-1">
                                    {type === 'HEAD_TILT' && <HeadTiltAnimation />}
                                    {type === 'UNEVEN_SHOULDERS' && <ShoulderAlignAnimation />}
                                    {type === 'SLOUCHING' && <SlouchAnimation />}
                                    {type === 'EXCESSIVE_MOVEMENT' && <MovementAnimation />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

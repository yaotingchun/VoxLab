"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { PostureIssue } from "@/hooks/usePostureAnalysis";

interface FeedbackPanelProps {
    score: number;
    isStable: boolean;
    issues: PostureIssue[];
}

// --- Specific Correction Animations (Concrete Silhouettes) ---

const HeadTiltAnimation = () => {
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-2 flex items-center justify-center">
                <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="45" fill="#1e293b" opacity="0.5" />

                    {/* Animated Human */}
                    <motion.g
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    >
                        {/* Static Shoulders (Base) */}
                        <path d="M20 90 Q50 90 80 90 L80 100 L20 100 Z" fill="#334155" />

                        {/* Rotating Neck & Head */}
                        <motion.g
                            initial={{ rotate: -15, transformOrigin: "50px 80px" }}
                            animate={{ rotate: 0 }}
                            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        >
                            {/* Neck */}
                            <rect x="42" y="60" width="16" height="25" fill="#94a3b8" rx="4" />

                            {/* Head (Filled Shape) */}
                            <ellipse cx="50" cy="45" rx="18" ry="22" fill="#cbd5e1" />

                            {/* Face details to show front view */}
                            <g opacity="0.6">
                                <circle cx="42" cy="42" r="2" fill="#334155" /> {/* Left Eye */}
                                <circle cx="58" cy="42" r="2" fill="#334155" /> {/* Right Eye */}
                                <path d="M48 55 Q50 58 52 55" stroke="#334155" strokeWidth="2" strokeLinecap="round" /> {/* Mouth */}
                            </g>
                        </motion.g>
                    </motion.g>

                    {/* Correction Curve Arrow */}
                    <motion.path
                        d="M75 30 Q90 50 75 70"
                        stroke="#60a5fa"
                        strokeWidth="3"
                        markerEnd="url(#arrowhead)"
                        fill="none"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />

                    <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0 0 L6 3 L0 6 Z" fill="#60a5fa" />
                        </marker>
                    </defs>
                </svg>
            </div>
            <p className="text-sm text-blue-300">Align Head Vertically</p>
        </div>
    );
};

const ShoulderAlignAnimation = () => {
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-2 flex items-center justify-center">
                <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="45" fill="#1e293b" opacity="0.5" />

                    {/* Animated Upper Body */}
                    <motion.g
                        initial={{ rotate: 10, transformOrigin: "50px 80px" }}
                        animate={{ rotate: 0 }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    >
                        {/* Shoulders/Torso */}
                        <path d="M20 60 Q50 50 80 60 L80 100 L20 100 Z" fill="#94a3b8" />

                        {/* Neck */}
                        <rect x="42" y="45" width="16" height="20" fill="#94a3b8" />

                        {/* Head */}
                        <circle cx="50" cy="35" r="16" fill="#cbd5e1" />
                    </motion.g>

                    {/* Alignment Line (Reference) */}
                    <line x1="10" y1="60" x2="90" y2="60" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />

                    {/* Down Arrow on High Side */}
                    <motion.path
                        d="M85 40 L85 55"
                        stroke="#60a5fa"
                        strokeWidth="3"
                        markerEnd="url(#arrowhead)"
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                            <path d="M0 0 L6 3 L0 6 Z" fill="#60a5fa" />
                        </marker>
                    </defs>
                </svg>
            </div>
            <p className="text-sm text-blue-300">Level Your Shoulders</p>
        </div>
    );
};

const SlouchAnimation = () => {
    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-2 flex items-center justify-center">
                <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="45" fill="#1e293b" opacity="0.5" />

                    {/* Chair Back (Context) */}
                    <rect x="20" y="40" width="5" height="60" fill="#475569" rx="2" />
                    <rect x="15" y="90" width="40" height="5" fill="#475569" rx="2" />

                    {/* Animated Body (Side View) */}
                    {/* We animate the path 'd' attribute directly for the morphing effect */}
                    <motion.path
                        /* 
                           From: Rounded back (C-shape)
                           To: Straight back (I-shape) 
                        */
                        d="M40 90 Q 25 60 55 40 L 55 25" // Initial curve
                        animate={{ d: "M40 90 Q 40 60 40 40 L 40 25" }} // Straight line
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        stroke="#cbd5e1"
                        strokeWidth="12"
                        strokeLinecap="round"
                        fill="none"
                    />

                    {/* Head Circle trailing the top of the spine */}
                    <motion.circle
                        cx="55" cy="25" r="14" fill="#cbd5e1"
                        initial={{ cx: 55, cy: 30 }}
                        animate={{ cx: 40, cy: 20 }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    />

                    {/* Face direction (Nose) */}
                    <motion.path
                        d="M68 30 L72 30"
                        stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round"
                        initial={{ d: "M68 30 L72 30", x: 0, y: 0 }}
                        animate={{ x: -15, y: -10 }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    />

                    {/* Lifting Arrow */}
                    <motion.path
                        d="M65 60 L65 30"
                        stroke="#60a5fa"
                        strokeWidth="3"
                        markerEnd="url(#arrowhead)"
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: -5, opacity: 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                            <path d="M0 0 L6 3 L0 6 Z" fill="#60a5fa" />
                        </marker>
                    </defs>
                </svg>
            </div>
            <p className="text-sm text-blue-300 font-medium">Straighten Back</p>
        </div>
    );
};

const MovementAnimation = () => (
    <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-2 flex items-center justify-center">
            <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
                {/* Background Circle */}
                <circle cx="50" cy="50" r="45" fill="#1e293b" opacity="0.5" />

                {/* Center Target */}
                <circle cx="50" cy="50" r="40" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />

                {/* Shaking Body Silhouette */}
                <motion.g
                    animate={{ x: [-2, 2, -1, 1, 0], y: [1, -1, 2, -2, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                >
                    {/* Torso */}
                    <path d="M30 100 L35 60 Q50 50 65 60 L70 100 Z" fill="#94a3b8" opacity="0.8" />
                    {/* Head */}
                    <circle cx="50" cy="40" r="15" fill="#cbd5e1" opacity="0.8" />
                </motion.g>

                {/* Locking Brackets */}
                <motion.path
                    d="M30 40 L20 40 L20 60 L30 60"
                    stroke="#60a5fa" strokeWidth="3" fill="none"
                    initial={{ scale: 1.2, opacity: 0, cx: 50, cy: 50 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.path
                    d="M70 40 L80 40 L80 60 L70 60"
                    stroke="#60a5fa" strokeWidth="3" fill="none"
                    initial={{ scale: 1.2, opacity: 0, cx: 50, cy: 50 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
                <defs>
                    <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <path d="M0 0 L6 3 L0 6 Z" fill="#60a5fa" />
                    </marker>
                </defs>
            </svg>
        </div>
        <p className="text-sm text-blue-300">Stabilize</p>
    </div>
)


export function FeedbackPanel({ score, isStable, issues }: FeedbackPanelProps) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 50) return "text-yellow-500";
        return "text-red-500";
    };

    const getStatusColor = (isStable: boolean) => {
        return isStable ? "bg-green-500/10 border-green-500/50" : "bg-red-500/10 border-red-500/50";
    };

    // Eliminate duplicate issue types to avoid showing same animation twice
    const uniqueIssueTypes = Array.from(new Set(issues.map(i => i.type)));

    return (
        <div className={`p-6 rounded-2xl border-2 backdrop-blur-sm transition-colors duration-300 ${getStatusColor(isStable)}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Posture Analysis</h2>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-400">Stability Score</span>
                    <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
                        {Math.round(score)}
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Live Feedback</h3>
                <div className="min-h-[100px]">
                    <AnimatePresence mode="popLayout">
                        {issues.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center text-green-400 bg-green-900/20 p-3 rounded-lg border border-green-500/20"
                            >
                                <span className="mr-2">✨</span> Great posture! Keep it up.
                            </motion.div>
                        ) : (
                            issues.map((item, index) => {
                                const isPositive = item.type.includes('_GOOD');
                                const isTip = item.type.includes('_TIP') || item.type.includes('_FIX');

                                let styleClass = "text-red-300 bg-red-900/20 border-red-500/20";
                                let icon = "⚠️";

                                if (isPositive) {
                                    styleClass = "text-green-300 bg-green-900/20 border-green-500/20";
                                    icon = "✨";
                                } else if (isTip) {
                                    styleClass = "text-yellow-300 bg-yellow-900/20 border-yellow-500/20";
                                    icon = "💡";
                                }

                                return (
                                    <motion.div
                                        key={`${item.type}-${index}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                        className={`flex items-center p-3 rounded-lg border mb-2 last:mb-0 ${styleClass}`}
                                    >
                                        <span className="mr-2">{icon}</span> {item.message}
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Visual Guide Animations */}
            <AnimatePresence>
                {uniqueIssueTypes.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mt-6 p-4 bg-slate-800/80 rounded-xl border border-slate-700"
                    >
                        <p className="text-xs text-center text-slate-400 mb-2 uppercase tracking-widest">Correction Guide</p>

                        <div className={`grid ${uniqueIssueTypes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                            {uniqueIssueTypes.map((type) => (
                                <div key={type} className="flex justify-center">
                                    {type === 'HEAD_TILT' && <HeadTiltAnimation />}
                                    {type === 'UNEVEN_SHOULDERS' && <ShoulderAlignAnimation />}
                                    {type === 'SLOUCHING' && <SlouchAnimation />}
                                    {type === 'EXCESSIVE_MOVEMENT' && <MovementAnimation />}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

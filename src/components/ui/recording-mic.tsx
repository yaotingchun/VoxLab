"use client";

import { motion } from "framer-motion";

export function RecordingMic({ className = "w-full h-full" }: { className?: string }) {
    return (
        <div className={className}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                {/* Metallic Chrome Gradients */}
                <defs>
                    <linearGradient id="chrome-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f3e8ff" />
                        <stop offset="50%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                    <radialGradient id="mic-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Outer Glow */}
                <motion.circle
                    cx="50" cy="50" r="45"
                    fill="url(#mic-glow)"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />

                {/* Animated Sound Waves (Circular) */}
                {[1, 2, 3].map((i) => (
                    <motion.circle
                        key={i}
                        cx="50"
                        cy="40"
                        r={12 + i * 8}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: [0, 0.5, 0],
                            scale: [0.8, 1.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.6,
                            ease: "easeOut"
                        }}
                    />
                ))}

                {/* Microphone Capsule */}
                <motion.rect
                    x="42" y="25" width="16" height="30" rx="8"
                    fill="url(#chrome-gradient)"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Grill Lines */}
                <g opacity="0.4">
                    <line x1="45" y1="32" x2="55" y2="32" stroke="black" strokeWidth="0.5" />
                    <line x1="44" y1="36" x2="56" y2="36" stroke="black" strokeWidth="0.5" />
                    <line x1="45" y1="40" x2="55" y2="40" stroke="black" strokeWidth="0.5" />
                </g>

                {/* Mic Body/Stand */}
                <motion.path
                    d="M 35 45 A 15 15 0 0 0 65 45 L 65 50 A 15 15 0 0 1 35 50 Z"
                    fill="#334155"
                />
                <rect x="48" y="55" width="4" height="20" fill="#334155" />
                <rect x="35" y="75" width="30" height="4" rx="2" fill="#334155" />

                {/* REC Indicator */}
                <motion.circle
                    cx="50"
                    cy="48"
                    r="2"
                    fill="#ef4444"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                />
                <motion.text
                    x="54" y="49.5"
                    fontSize="4"
                    fill="#ef4444"
                    fontWeight="bold"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    REC
                </motion.text>
            </svg>
        </div>
    );
}

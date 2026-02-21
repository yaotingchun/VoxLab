"use client";

import { motion } from "framer-motion";
import { Activity, Mic, Music } from "lucide-react";

interface VocalFeedbackPanelProps {
    pitch: number;
    wpm: number;
    isListening: boolean;
    volume: number;
}

export function VocalFeedbackPanel({ pitch, wpm, isListening, volume }: VocalFeedbackPanelProps) {
    // Determine pitch range for color (Rough human speech ranges)
    const getPitchColor = (p: number) => {
        if (p === 0) return "text-slate-500";
        if (p < 85) return "text-blue-400"; // Very low
        if (p > 255) return "text-purple-400"; // Very high
        return "text-green-400"; // Normal range
    };

    // Activity threshold for bar animations
    const isActive = isListening && volume > 0.01;

    return (
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border-2 border-purple-500/30 shadow-lg h-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-purple-400" />
                    Vocal Analysis
                </h2>
                {isListening && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-tighter">Live</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
                {/* Real-time Pitch */}
                <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <Music className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Pitch</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-bold font-mono transition-colors duration-300 ${getPitchColor(pitch)}`}>
                            {pitch > 0 ? Math.round(pitch) : "--"}
                        </span>
                        <span className="text-slate-500 text-sm font-bold">Hz</span>
                    </div>
                    <div className="mt-3 flex gap-0.5 h-1 items-end">
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="flex-1 bg-purple-500/30 rounded-full"
                                animate={{
                                    height: isActive ? `${10 + Math.random() * 90}%` : "20%"
                                }}
                                transition={{ duration: 0.2, repeat: Infinity, repeatType: "reverse" }}
                            />
                        ))}
                    </div>
                </div>

                {/* Live WPM */}
                <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                        <Activity className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-bold uppercase tracking-wider">Pace</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold font-mono text-white">
                            {wpm}
                        </span>
                        <span className="text-slate-500 text-sm font-bold">WPM</span>
                    </div>
                    <div className="mt-3 text-[10px] font-medium text-slate-400">
                        Target: 130-160 WPM
                    </div>
                </div>
            </div>

            {/* Quick Tip */}
            {pitch > 0 && (
                <div className="text-[11px] text-slate-400 italic text-center px-4">
                    {pitch < 120 ? "Projecting from your chest adds authority." : "A varied pitch keeps your audience engaged."}
                </div>
            )}
        </div>
    );
}

"use client";

import { motion } from "framer-motion";

interface ScoreCardProps {
    title: string;
    score: number;
    trend: number;
}

// Profile Design Tokens
const GLASS_CARD = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 hover:bg-white/[0.05] transition-all duration-300";

export function ScoreCard({ title, score, trend }: ScoreCardProps) {
    const isPositive = trend > 0;
    const isNeutral = trend === 0;

    const getColors = (title: string) => {
        switch (title.toLowerCase()) {
            case "voice": return "from-blue-500 to-indigo-500";
            case "posture & facial": return "from-emerald-500 to-teal-500";
            case "content": return "from-amber-500 to-orange-500";
            case "overall": return "from-pink-500 to-rose-500";
            default: return "from-primary to-purple-500";
        }
    };

    const gradientClass = getColors(title);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className={`${GLASS_CARD} p-6 rounded-3xl text-center flex flex-col items-center justify-between h-full relative overflow-hidden group`}
        >
            <h4 className="text-gray-500 font-black text-[10px] uppercase tracking-widest mb-4 group-hover:text-white transition-colors">{title}</h4>

            <div className="text-4xl text-white font-black mb-4 tracking-tighter">
                {score}%
            </div>

            {/* Progress Bar Track */}
            <div className="w-full bg-white/5 rounded-full h-1.5 mb-4 overflow-hidden relative border border-white/5">
                {/* Progress Bar Fill with Gradient */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`bg-gradient-to-r ${gradientClass} h-full rounded-full`}
                />
            </div>

            {/* Trend Footer Text */}
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight leading-snug">
                {isNeutral ? (
                    `Steady performance`
                ) : isPositive ? (
                    `Improved by ${Math.abs(trend)}%`
                ) : (
                    `Dropped by ${Math.abs(trend)}%`
                )}
            </p>
        </motion.div>
    );
}

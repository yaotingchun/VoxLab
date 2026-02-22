"use client";

import { motion } from "framer-motion";

interface ScoreCardProps {
    title: string;
    score: number;
    trend: number;
}

export function ScoreCard({ title, score, trend }: ScoreCardProps) {
    const isPositive = trend > 0;
    const isNeutral = trend === 0;

    // Based on the provided UI design image:
    // White card background, central blue percentage text, a gradient progress bar, and small trend text below.

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-slate-900 border text-center border-slate-700/50 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-between h-full relative overflow-hidden"
        >
            <h4 className="text-slate-400 font-bold text-sm mb-4">{title}</h4>

            <div className="text-4xl text-white font-black mb-4">
                {score}%
            </div>

            {/* Progress Bar Track */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 mb-4 overflow-hidden relative border border-slate-700/50">
                {/* Progress Bar Fill with Gradient */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                />
            </div>

            {/* Trend Footer Text */}
            <p className="text-[10px] text-slate-500 font-medium">
                {isNeutral ? (
                    `Score remained steady in the last week`
                ) : isPositive ? (
                    `You've improved ${Math.abs(trend)}% in the last week`
                ) : (
                    `You've dropped ${Math.abs(trend)}% in the last week`
                )}
            </p>
        </motion.div>
    );
}

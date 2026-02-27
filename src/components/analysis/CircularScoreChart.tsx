"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CircularScoreChartProps {
    score: number;       // 0 to 100
    label: string;       // e.g., "Vocal Score"
    color: string;       // Tailwind text/stroke color class (e.g., "text-pink-500")
    size?: number;       // Pixel size (width/height)
    strokeWidth?: number;
}

export function CircularScoreChart({
    score,
    label,
    color,
    size = 140,
    strokeWidth = 10,
}: CircularScoreChartProps) {
    const [animatedScore, setAnimatedScore] = useState(0);

    // Animate score number counting up
    useEffect(() => {
        const duration = 1500; // 1.5s
        const steps = 30;
        const stepTime = Math.abs(Math.floor(duration / steps));
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            // Ease out quad
            const easing = progress * (2 - progress);
            setAnimatedScore(Math.round(score * easing));

            if (currentStep >= steps) {
                setAnimatedScore(score);
                clearInterval(timer);
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, [score]);

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background Ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-white/5"
                    />
                    {/* Animated Foreground Ring */}
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className={color}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeDasharray={circumference}
                    />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-black ${color}`}>
                        {animatedScore}
                    </span>
                    <span className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        Score
                    </span>
                </div>
            </div>
            {label && (
                <div className="mt-4 text-center">
                    <span className="text-sm font-bold text-slate-300 uppercase tracking-widest bg-white/[0.05] px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                        {label}
                    </span>
                </div>
            )}
        </div>
    );
}

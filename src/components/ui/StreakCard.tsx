"use client";

import { motion } from "framer-motion";
import { Flame, Check } from "lucide-react";
import { getLocalDateString, StreakData } from "@/lib/streak";
import { useMemo } from "react";

interface StreakCardProps {
    streakData: StreakData | null;
    isUpdating?: boolean;
}

export function StreakCard({ streakData, isUpdating = false }: StreakCardProps) {
    const currentStreak = streakData?.currentStreak || 0;
    const history = streakData?.practiceHistory || [];

    // Calculate dates for the current week (Mon-Sun)
    const weekDays = useMemo(() => {
        const days = [];
        const today = new Date();

        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            days.push({
                dateObj: date,
                dateStr: getLocalDateString(date),
                label: ["M", "T", "W", "T", "F", "S", "S"][i]
            });
        }
        return days;
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
        >
            {/* Ambient Red Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <motion.div
                    animate={
                        isUpdating
                            ? { scale: [1, 1.3, 1], filter: ["drop-shadow(0 0 0px #ef4444)", "drop-shadow(0 0 20px #ef4444)", "drop-shadow(0 0 0px #ef4444)"] }
                            : { y: [0, -4, 0] }
                    }
                    transition={
                        isUpdating
                            ? { duration: 0.5, ease: "easeInOut", repeat: Infinity }
                            : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }
                    className="mb-2"
                >
                    <Flame
                        size={64}
                        strokeWidth={1.5}
                        className={currentStreak > 0 ? "text-orange-500 fill-orange-400" : "text-slate-600"}
                    />
                </motion.div>

                {/* Counter */}
                <h3 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-1">
                    {currentStreak} Day Streak!
                </h3>
                <p className="text-slate-400 text-sm font-medium mb-8">
                    {currentStreak > 0 ? "You're on fire! Keep it up." : "Sync a session today to start a streak!"}
                </p>

                {/* Weekly Grid */}
                <div className="w-full">
                    <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest text-center mb-3">
                        Weekly Activity
                    </h4>
                    <div className="flex justify-between items-center px-2">
                        {weekDays.map((day, idx) => {
                            const isPracticed = history.includes(day.dateStr);
                            const isToday = getLocalDateString(new Date()) === day.dateStr;

                            return (
                                <div key={idx} className="flex flex-col items-center gap-2">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                            ${isPracticed
                                                ? "bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.4)] border-red-500 text-red-400"
                                                : "border-slate-700 bg-slate-800 text-slate-500"} 
                                            ${isToday && !isPracticed ? "border-slate-500 text-slate-400" : ""}
                                            border-2`}
                                    >
                                        {isPracticed ? (
                                            <Check size={16} strokeWidth={3} className="text-red-400" />
                                        ) : null}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold ${isPracticed ? "text-red-400/80" : "text-slate-500"}`}>
                                        {day.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

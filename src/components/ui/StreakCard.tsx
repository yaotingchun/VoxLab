"use client";

import { motion } from "framer-motion";
import { Flame, Check } from "lucide-react";
import { getLocalDateString, StreakData } from "@/lib/streak";
import { useMemo } from "react";

interface StreakCardProps {
    streakData: StreakData | null;
    isUpdating?: boolean;
}

const GLASS_CARD = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 hover:bg-white/[0.05] transition-all duration-300";

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${GLASS_CARD} p-8 rounded-3xl relative overflow-hidden group`}
        >
            {/* Ambient Red Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-orange-500/20 transition-colors duration-500" />

            <div className="relative z-10 flex flex-col items-center">
                <motion.div
                    animate={
                        isUpdating
                            ? { scale: [1, 1.1, 1], filter: ["drop-shadow(0 0 0px #f97316)", "drop-shadow(0 0 20px #f97316)", "drop-shadow(0 0 0px #f97316)"] }
                            : { y: [0, -4, 0] }
                    }
                    transition={
                        isUpdating
                            ? { duration: 1, ease: "easeInOut", repeat: Infinity }
                            : { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }
                    className="mb-4"
                >
                    <Flame
                        size={64}
                        strokeWidth={1.5}
                        className={currentStreak > 0 ? "text-orange-500 fill-orange-500/20" : "text-gray-700"}
                    />
                </motion.div>

                {/* Counter */}
                <h3 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2 tracking-tighter">
                    {currentStreak} Day Streak!
                </h3>
                <p className="text-gray-400 text-sm font-medium mb-10">
                    {currentStreak > 0 ? "You're on fire! Keep it up." : "Start your journey today!"}
                </p>

                {/* Weekly Grid */}
                <div className="w-full">
                    <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest text-center mb-5">
                        Weekly Activity
                    </h4>
                    <div className="flex justify-between items-center px-2">
                        {weekDays.map((day, idx) => {
                            const isPracticed = history.includes(day.dateStr);
                            const isToday = getLocalDateString(new Date()) === day.dateStr;

                            return (
                                <div key={idx} className="flex flex-col items-center gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                                            ${isPracticed
                                                ? "bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.3)] border-orange-500/50 text-orange-400"
                                                : "border-white/5 bg-white/5 text-gray-600"} 
                                            ${isToday && !isPracticed ? "border-white/20 text-gray-400" : ""}
                                            border-2`}
                                    >
                                        {isPracticed ? (
                                            <Check size={18} strokeWidth={3} className="text-orange-400" />
                                        ) : null}
                                    </div>
                                    <span className={`text-[10px] uppercase font-black tracking-tighter ${isPracticed ? "text-orange-400" : "text-gray-600"}`}>
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

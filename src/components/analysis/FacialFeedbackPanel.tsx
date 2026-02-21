"use client";

import { motion } from "framer-motion";
import { Smile, Eye, Activity, Zap, Frown } from "lucide-react";

interface FacialFeedbackPanelProps {
    engagementScore: number;
    isSmiling: boolean;
    isEyeContactSteady: boolean;
    blinkRate: number;
    isNervous: boolean;
}

export function FacialFeedbackPanel({
    engagementScore,
    isSmiling,
    isEyeContactSteady,
    blinkRate,
    isNervous
}: FacialFeedbackPanelProps) {
    return (
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 space-y-6 shadow-xl">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Smile className="w-4 h-4 text-blue-400" /> Facial Analysis
            </h3>

            {/* Engagement Score Bar - HIDDEN */}
            {/* <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Engagement</span>
                    <span className={`font-bold ${engagementScore > 70 ? 'text-green-400' : 'text-slate-400'}`}>
                        {Math.round(engagementScore)}%
                    </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${engagementScore > 70 ? 'bg-green-500' : 'bg-blue-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${engagementScore}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div> */}

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Eye Contact */}
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-colors duration-300 ${isEyeContactSteady
                    ? 'bg-green-900/10 border-green-500/20'
                    : 'bg-yellow-900/10 border-yellow-500/20'
                    }`}>
                    <div className="mb-2">
                        {isEyeContactSteady ? (
                            <Eye className="w-6 h-6 text-green-400" />
                        ) : (
                            <Eye className="w-6 h-6 text-yellow-400 opacity-50" />
                        )}
                    </div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Eye Contact</div>
                    <div className={`text-sm font-bold mt-1 ${isEyeContactSteady ? 'text-green-400' : 'text-yellow-400'}`}>
                        {isEyeContactSteady ? 'Steady' : 'Drifting'}
                    </div>
                </div>

                {/* Smile */}
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-colors duration-300 ${isSmiling
                    ? 'bg-green-900/10 border-green-500/20'
                    : 'bg-slate-800/50 border-slate-700'
                    }`}>
                    <div className="mb-2">
                        {isSmiling ? (
                            <Smile className="w-6 h-6 text-green-400" />
                        ) : (
                            <Frown className="w-6 h-6 text-slate-500" />
                        )}
                    </div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Expression</div>
                    <div className={`text-sm font-bold mt-1 ${isSmiling ? 'text-green-400' : 'text-slate-400'}`}>
                        {isSmiling ? 'Smiling' : 'Neutral'}
                    </div>
                </div>

                {/* Blink Rate - HIDDEN */}
                {/* <div className={`col-span-2 p-3 rounded-xl border flex items-center justify-between px-4 transition-colors duration-300 ${!isNervous
                    ? 'bg-slate-800/50 border-slate-700'
                    : 'bg-red-900/10 border-red-500/20'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Activity className={`w-5 h-5 ${!isNervous ? 'text-blue-400' : 'text-red-400'}`} />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Blink Rate</div>
                            <div className={`text-sm font-bold ${!isNervous ? 'text-slate-300' : 'text-red-400'}`}>
                                {isNervous ? 'High / Nervous' : 'Normal'}
                            </div>
                        </div>
                    </div>
                    <div className="text-xl font-mono text-slate-500 flex items-center gap-1">
                        {blinkRate} <span className="text-xs text-slate-600">bpm</span>
                    </div>
                </div> */}
            </div>
        </div>
    );
}

import { PostureIssue } from "@/hooks/usePostureAnalysis";
import { ArrowUp, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CorrectionGuideProps {
    issues: PostureIssue[];
}

export function CorrectionGuide({ issues }: CorrectionGuideProps) {
    const hasHeadTilt = issues.some(i => i.type === 'HEAD_TILT');
    const hasUnevenShoulders = issues.some(i => i.type === 'UNEVEN_SHOULDERS');
    const isGoodPosture = issues.length === 0;

    return (
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-3 w-72 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {/* HEAD TILT GUIDE */}
                {hasHeadTilt && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className="bg-slate-900/90 backdrop-blur-xl border border-red-500/30 p-4 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.2)] relative overflow-hidden group"
                    >
                        <motion.div
                            className="absolute inset-0 bg-red-500/5"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="flex items-center gap-4 text-white relative z-10">
                            <motion.div
                                className="bg-red-500/20 p-2.5 rounded-xl border border-red-500/30"
                                animate={{ rotate: [0, 15, -15, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <ArrowUp className="w-6 h-6 rotate-45 text-red-400" />
                            </motion.div>
                            <div>
                                <h3 className="font-bold text-sm tracking-tight">Align Head</h3>
                                <p className="text-[11px] text-red-200/60 uppercase font-bold tracking-widest mt-0.5">Tilt Detected</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* SHOULDER GUIDE */}
                {hasUnevenShoulders && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        className="bg-slate-900/90 backdrop-blur-xl border border-orange-500/30 p-4 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.2)] relative overflow-hidden"
                    >
                        <motion.div
                            className="absolute inset-0 bg-orange-500/5"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                        />
                        <div className="flex items-center gap-4 text-white relative z-10">
                            <motion.div
                                className="bg-orange-500/20 p-2.5 rounded-xl border border-orange-500/30"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <ArrowLeftRight className="w-6 h-6 text-orange-400" />
                            </motion.div>
                            <div>
                                <h3 className="font-bold text-sm tracking-tight">Level Shoulders</h3>
                                <p className="text-[11px] text-orange-200/60 uppercase font-bold tracking-widest mt-0.5">Asymmetry Detected</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* GOOD POSTURE INDICATOR */}
                {isGoodPosture && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="bg-emerald-500/90 backdrop-blur-md px-6 py-2.5 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.3)] self-end border border-white/20"
                    >
                        <div className="flex items-center gap-3 text-white">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <CheckCircle2 className="w-4 h-4 text-black/40 fill-white" />
                            </motion.div>
                            <span className="text-sm font-bold tracking-tight">Perfect Posture</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

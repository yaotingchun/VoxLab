"use client";

import React, { useState } from "react";
import { UnifiedWebcamView } from "./UnifiedWebcamView";
import { FeedbackOverlay } from "./FeedbackOverlay";
import { useUnifiedAnalysis } from "@/hooks/useUnifiedAnalysis";
import { SessionSummary } from "@/components/analysis/SessionSummary";
import { analyzeSession } from "@/app/actions/analyzeSession";
import { AnalysisFeedbackPanel } from "@/components/analysis/AnalysisFeedbackPanel";
import { motion, AnimatePresence } from "framer-motion";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PresentationCoach() {
    const {
        result,
        analyzePosture,
        analyzeFace,
        startSession,
        endSession,
        isSessionActive
    } = useUnifiedAnalysis();

    const [sessionSummary, setSessionSummary] = useState<any | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleStart = () => {
        setSessionSummary(null);
        startSession();
    };

    const handleStop = async () => {
        console.log("Stopping session...");
        const data = endSession();
        console.log("Session Data from Hook:", data);

        setIsAnalyzing(true);

        // Call Server Action
        try {
            console.log("Calling analyzeSession server action...");
            const aiSummary = await analyzeSession({
                duration: data.duration,
                averageScore: data.averageScore,
                issueCounts: data.issueCounts,
                faceMetrics: data.faceMetrics
            });
            console.log("AI Summary Result:", aiSummary);

            if ('error' in aiSummary) {
                console.error("Analysis Error:", aiSummary.error);
                alert(`AI Analysis Failed: ${aiSummary.error}`);
            } else {
                setSessionSummary(aiSummary);
            }
        } catch (e) {
            console.error("Failed to analyze", e);
            alert("Failed to call analysis server action");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 max-w-7xl mx-auto w-full">

            {/* LEFT PANEL: Video */}
            <div className="flex-1 flex flex-col gap-6 min-h-0">

                {/* Webcam & Overlay (Full Aspect Ratio) */}
                <div className="w-full relative bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col flex-none aspect-video">

                    {/* Webcam Layer */}
                    <div className="relative flex-1">
                        <UnifiedWebcamView
                            onPoseResults={analyzePosture}
                            onFaceResults={analyzeFace}
                            isAutoFramed={result.isAutoFramed}
                        />

                        {/* Feedback Overlay */}
                        {isSessionActive && (
                            <FeedbackOverlay
                                isNervous={result.isNervous}
                                isDistracted={result.isDistracted}
                                emotionState={result.emotionState}
                                postureMessages={result.feedbackItems.filter(i => !['SMILE_GOOD', 'SMILE_TIP', 'EYE_GOOD', 'EYE_FIX', 'BLINK_FAST', 'MOUTH_TENSION', 'EYES_SHIFTY', 'HIGH_STRESS'].includes(i.type)).map(i => i.message)}
                            />
                        )}
                    </div>

                    {/* High Stress Warning Overlay */}
                    <AnimatePresence>
                        {isSessionActive && result.isHighStress && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 text-white px-6 py-3 rounded-full border-2 border-red-500 shadow-xl z-50 flex items-center gap-3 backdrop-blur-md"
                            >
                                <span className="text-2xl">⚠️</span>
                                <span className="font-bold">High Stress Detected! Take a moment to reset.</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Loading State */}
                    {isAnalyzing && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-blue-300 font-bold animate-pulse">Consulting Gemini Coach...</p>
                        </div>
                    )}

                    {/* Start Overlay */}
                    {!isSessionActive && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center space-y-6 max-w-md w-full bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl"
                            >
                                <div className="flex justify-center gap-4 mb-2">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                                        <Video className="w-6 h-6 text-blue-400" />
                                    </div>
                                </div>

                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">Visual Presence Coach</h1>
                                    <p className="text-sm text-gray-400 mx-auto mb-4">
                                        Real-time analysis of your posture, expression, and body language.
                                    </p>
                                </div>

                                <div className="flex-1 w-full flex flex-col justify-center items-center text-center relative pointer-events-auto">
                                    <div className="flex items-center gap-3 mb-4 text-slate-300 bg-slate-900/40 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700 shadow-xl">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                        <span className="text-sm font-medium">Ready</span>
                                    </div>

                                    <Button
                                        size="lg"
                                        onClick={handleStart}
                                        disabled={isAnalyzing}
                                        className="h-10 px-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all font-semibold"
                                    >
                                        Start Coaching
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Stop Button (when session active) */}
                    {isSessionActive && (
                        <div className="absolute top-4 right-4 z-[60] flex items-center gap-3">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleStop}
                                className="rounded-full shadow-lg flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white border-none transition-all"
                            >
                                ⏹ End & Analyze
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: Facial + Posture Metrics */}
            <div className="w-full lg:w-[480px] flex flex-col gap-6 min-w-0">
                <div className="flex-1 min-h-[450px]">
                    <AnalysisFeedbackPanel
                        engagementScore={result.face.engagementScore}
                        isSmiling={result.isSmiling}
                        isEyeContactSteady={result.isEyeContactSteady}
                        blinkRate={result.face.blinkRate}
                        isNervous={result.hasHighBlinkRate}
                        postureScore={result.posture.score}
                        isPostureStable={result.posture.isStable}
                        postureIssues={result.posture.issues}
                    />
                </div>
            </div>

            {/* Gemini AI Coach Summary - Full Screen Modal */}
            <AnimatePresence>
                {sessionSummary && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 overflow-y-auto"
                    >
                        <div className="w-full max-w-2xl my-auto">
                            <SessionSummary
                                data={sessionSummary}
                                onClose={() => setSessionSummary(null)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

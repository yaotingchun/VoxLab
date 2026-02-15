"use client";

import React, { useState } from "react";
import { UnifiedWebcamView } from "./UnifiedWebcamView";
import { FeedbackOverlay } from "./FeedbackOverlay";
import { useUnifiedAnalysis } from "@/hooks/useUnifiedAnalysis";
import { FeedbackPanel } from "@/components/posture/FeedbackPanel";
import { SessionSummary } from "@/components/analysis/SessionSummary"; // NEW
import { analyzeSession } from "@/app/actions/analyzeSession"; // NEW
import { FacialFeedbackPanel } from "@/components/analysis/FacialFeedbackPanel"; // NEW
import { motion, AnimatePresence } from "framer-motion";

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

            if (!aiSummary.error) {
                setSessionSummary(aiSummary);
            } else {
                console.error("Analysis Error:", aiSummary.error);
                alert(`AI Analysis Failed: ${aiSummary.error}`); // Temporary alert for debug
            }
        } catch (e) {
            console.error("Failed to analyze", e);
            alert("Failed to call analysis server action");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-7xl mx-auto min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)]">
            {/* Left: Main Interaction Area */}
            <div className="flex-1 flex flex-col relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                {/* Webcam & Overlay */}
                <div className="flex-1 relative">
                    <UnifiedWebcamView
                        onPoseResults={analyzePosture}
                        onFaceResults={analyzeFace}
                    />

                    {/* Only show overlay when active */}
                    {isSessionActive && (
                        <FeedbackOverlay
                            isNervous={result.isNervous}
                            isDistracted={result.isDistracted}
                            emotionState={result.emotionState}
                            // Split feedback for different display zones
                            postureMessages={result.feedbackItems.filter(i => !['SMILE_GOOD', 'SMILE_TIP', 'EYE_GOOD', 'EYE_FIX', 'BLINK_FAST', 'MOUTH_TENSION', 'EYES_SHIFTY', 'HIGH_STRESS'].includes(i.type)).map(i => i.message)}
                        />
                    )}

                    {/* High Stress Warning Overlay (Overlap Logic) */}
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
                </div>

                {/* Controls Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex justify-center items-end pb-8">
                    {!isSessionActive ? (
                        <button
                            onClick={handleStart}
                            disabled={isAnalyzing}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-blue-500/50 transition-all transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>▶ Start Coaching</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-red-500/50 transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                            <span>⏹ End & Analyze</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Right: Metrics Sidebar */}
            <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar pb-32 h-full">
                {/* Score Card */}
                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl">
                    <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Confidence Score</h3>
                    <div className="flex items-end gap-3">
                        <span className={`text-6xl font-bold ${result.totalScore > 80 ? 'text-green-400' :
                            result.totalScore > 50 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {Math.round(result.totalScore)}
                        </span>
                        <span className="text-slate-500 text-xl font-medium mb-2">/ 100</span>
                    </div>
                </div>

                {/* Facial Analysis Panel (NEW) */}
                <FacialFeedbackPanel
                    engagementScore={result.face.engagementScore}
                    isSmiling={result.isSmiling}
                    isEyeContactSteady={result.isEyeContactSteady}
                    blinkRate={result.face.blinkRate}
                    isNervous={result.hasHighBlinkRate}
                />

                {/* Posture Analysis Card */}
                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 space-y-4 shadow-xl">
                    <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span>🧍</span> Posture & Stability
                    </h3>

                    {/* Posture Stability */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-300">Stability Score</span>
                            <span className="text-slate-400">{Math.round(result.posture.score)}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${result.posture.score < 60 ? 'bg-red-500' : 'bg-purple-500'}`}
                                style={{ width: `${result.posture.score}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Feedback Panel (Posture Only) */}
                <FeedbackPanel
                    score={result.totalScore} // Note: This is total score, maybe should be result.posture.score? User asked to remove *facial feedback* from here.
                    isStable={!result.isHighStress}
                    // Filter out facial feedback types so this box only shows posture issues
                    issues={result.feedbackItems.filter(i => !['SMILE_GOOD', 'SMILE_TIP', 'EYE_GOOD', 'EYE_FIX', 'BLINK_FAST', 'MOUTH_TENSION', 'EYES_SHIFTY'].includes(i.type)) as any}
                />
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

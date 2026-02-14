"use client";

import React, { useState } from "react";
import { WebcamView } from "./WebcamView";
import { FeedbackPanel } from "./FeedbackPanel";
import { usePostureAnalysis } from "@/hooks/usePostureAnalysis";

export function PostureAnalyzer() {
    const { result, analyze, startSession, endSession, isSessionActive } = usePostureAnalysis();
    const [feedback, setFeedback] = useState<{ summary: string; tips: string[] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Import the server action (assuming it's available)
    // We need to dynamically import or verify the path. 
    // Since I created specific path `src/app/actions/analyzeSession.ts`, I will assume I can import it.
    // However, I can't add imports with replace_file_content if I don't target the top of the file.
    // I will use a separate step to add the import if needed, or I can use `require` if Next.js allows, 
    // but better to just paste the whole file content to ensure clean imports.
    // Actually, I'll just rewrite the component body and handle imports separately or hope auto-import works? 
    // No, I must be explicit. I will rewrite the whole file to be safe.

    // ... wait, I'm inside `replace_file_content`. I should probably just overwrite the file to be clean.
    return (
        <div className="flex flex-col lg:flex-row gap-8 p-6 max-w-7xl mx-auto">
            {/* Left Column: Video Feed */}
            <div className="flex-1 flex flex-col items-center">
                <div className="relative w-full">
                    <WebcamView onResults={analyze} />
                </div>

                <div className="mt-6 flex justify-center">
                    {!isSessionActive ? (
                        <button
                            onClick={() => {
                                setFeedback(null);
                                startSession();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition transform hover:scale-105 flex items-center"
                        >
                            <span>▶ Start Session</span>
                        </button>
                    ) : (
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                const data = endSession();
                                try {
                                    // Dynamic import to avoid build errors if file not found yet? 
                                    // No, standards imports. I'll fix imports in next step.
                                    const { analyzeSession } = await import("@/app/actions/analyzeSession");
                                    const result = await analyzeSession(data);
                                    if (result.error) {
                                        console.error(result.error);
                                    } else {
                                        setFeedback(result);
                                    }
                                } catch (e) {
                                    console.error("Analysis Failed", e);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition transform hover:scale-105 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">Analyzing...</span>
                            ) : (
                                <span>⏹ End & Analyze</span>
                            )}
                        </button>
                    )}
                </div>

                <p className="mt-4 text-gray-400 text-sm">
                    {isSessionActive
                        ? "Recording your posture... Press 'End' to get AI feedback."
                        : "Ready to start. Ensure good lighting."}
                </p>
            </div>

            {/* Right Column: Analysis & Feedback */}
            <div className="w-full lg:w-96 space-y-6">
                <FeedbackPanel
                    score={result.score}
                    isStable={result.isStable}
                    issues={result.issues}
                />

                {/* AI Coach Summary */}
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 min-h-[200px] flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">Gemini AI Coach</span>
                        <span className="ml-2 text-xs bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded border border-blue-500/30">PRO</span>
                    </h3>

                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-3">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm animate-pulse">Generating personalized advice...</p>
                        </div>
                    ) : feedback ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="text-slate-300 mb-4 text-sm leading-relaxed border-l-4 border-blue-500 pl-3 italic">
                                "{feedback.summary}"
                            </p>

                            <h4 className="text-sm font-semibold text-slate-200 mb-2">💡 Quick Tips:</h4>
                            <ul className="space-y-2">
                                {feedback.tips?.map((tip, idx) => (
                                    <li key={idx} className="text-sm text-slate-400 flex items-start">
                                        <span className="text-blue-400 mr-2">•</span>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic text-center">
                            Start a session to receive a comprehensive analysis.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

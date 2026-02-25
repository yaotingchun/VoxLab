"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { UnifiedWebcamView } from "@/components/analysis/UnifiedWebcamView";
import { useUnifiedAnalysis } from "@/hooks/useUnifiedAnalysis";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { SpeechCoachWidget } from "@/components/coach/SpeechCoachWidget";
import { FeedbackOverlay } from "@/components/analysis/FeedbackOverlay";

import { UnifiedFeedbackPanel } from "@/components/analysis/UnifiedFeedbackPanel";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Video, Mic, Square, AlertTriangle, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { DetailedSessionReport } from "@/components/analysis/DetailedSessionReport";
import { analyzeSession } from "@/app/actions/analyzeSession";
import { analyzeVocal } from "@/app/actions/analyzeVocal";
import { analyzePosture as getAIPostureAnalysis } from "@/app/actions/analyzePosture";
import { saveSessionToGCS, getGCSUploadUrl } from "@/app/actions/saveSession";
import { useAuth } from "@/contexts/AuthContext";
import { saveSession, getSessionStats } from "@/lib/sessions";
import { updateStreak } from "@/lib/streaks";
import { checkAndAwardBadges, BADGE_DEFINITIONS } from "@/lib/badges";
// ...

function PracticePageInner() {
    const searchParams = useSearchParams();
    const topic = searchParams.get("topic");

    const {
        result,
        analyzePosture,
        analyzeFace,
        startSession,
        endSession,
        isSessionActive
    } = useUnifiedAnalysis();

    const {
        isListening,
        transcript,
        wpm,
        elapsedTime,
        totalWords,
        fillerCounts,
        wpmHistory,
        pauseCount,
        startListening,
        stopListening,
        reset: resetSpeech,
        pauseStats,
        error,
        words
    } = useSpeechRecognition();

    const {
        startAudioAnalysis,
        stopAudioAnalysis,
        audioStats,
        volumeSamples,
        pitchSamples,
        currentPitch,
        currentVolume
    } = useAudioAnalysis();

    const { user } = useAuth();
    const [isStarted, setIsStarted] = useState(false);
    const [sessionSummary, setSessionSummary] = useState<any | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newBadges, setNewBadges] = useState<string[]>([]);

    // Video Recording State
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const videoResolveRef = useRef<((blob: Blob) => void) | null>(null);

    const handleVideoRecorded = useCallback((blob: Blob) => {
        if (videoResolveRef.current) {
            videoResolveRef.current(blob);
            videoResolveRef.current = null;
        }
    }, []);

    // Auto-scroll transcript
    const transcriptRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript]);

    // Toggle Session
    const handleToggleSession = async () => {
        if (isStarted) {
            // Stop everything
            setIsStarted(false);
            const data = endSession(); // Analysis
            stopListening(); // Speech
            stopAudioAnalysis(); // Audio

            if (audioStream) {
                audioStream.getTracks().forEach(t => t.stop());
                setAudioStream(null);
            }

            setIsAnalyzing(true);
            try {
                // Wait for video buffer to finish processing
                const videoBlob = await new Promise<Blob>((resolve) => {
                    videoResolveRef.current = resolve;
                    // Timeout fallback in case recorder fails
                    setTimeout(() => resolve(new Blob()), 5000);
                });

                let videoUrl = undefined;
                if (videoBlob.size > 0) {
                    try {
                        const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
                        const res = await getGCSUploadUrl(videoBlob.type, ext);
                        if (res.success && res.uploadUrl) {
                            await fetch(res.uploadUrl, {
                                method: 'PUT',
                                body: videoBlob,
                                headers: { 'Content-Type': videoBlob.type }
                            });
                            videoUrl = res.fileUrl;
                        }
                    } catch (e) {
                        console.error("Video Upload Failed", e);
                    }
                }

                // Get Audio Stats & Samples
                const audioResult = audioStats;

                // Use the real pauseStats calculated in useSpeechRecognition
                // If it's null (no words), we pass null
                const finalPauseStats = pauseStats;

                const speechMetricsPayload = {
                    totalWords,
                    fillerCounts,
                    // @ts-ignore - pauseStats structure mismatch check
                    pauseStats: finalPauseStats ? finalPauseStats.stats : undefined,
                    pauseCount,
                    wpmHistory
                };

                const audioMetricsPayload = audioResult ? audioResult.stats : undefined;

                const mode = searchParams.get("mode");
                let materialContext = "";
                if (mode === "lecture") {
                    materialContext = sessionStorage.getItem("lecture_material") || "";
                }

                const [aiSummary, vocalSummary, postureSummary] = await Promise.all([
                    analyzeSession({
                        duration: data.duration,
                        averageScore: data.averageScore,
                        issueCounts: data.issueCounts,
                        faceMetrics: data.faceMetrics,
                        topic: topic,
                        transcript: transcript,
                        speechMetrics: speechMetricsPayload,
                        // @ts-ignore
                        audioMetrics: audioMetricsPayload,
                        materialContext: materialContext // Pass the lecture material
                    }),
                    analyzeVocal({
                        speechMetrics: speechMetricsPayload,
                        // @ts-ignore
                        audioMetrics: audioMetricsPayload
                    }),
                    getAIPostureAnalysis({
                        issueCounts: data.issueCounts,
                        faceMetrics: data.faceMetrics
                    })
                ]);

                if ('error' in aiSummary) {
                    console.error("General Analysis Error:", aiSummary.error);
                }
                if ('error' in vocalSummary) {
                    console.error("Vocal Analysis Error:", vocalSummary.error);
                }
                if ('error' in postureSummary) {
                    console.error("Posture Analysis Error:", postureSummary.error);
                }

                const finalSummaryData = {
                    ...aiSummary,
                    vocalSummary: 'error' in vocalSummary ? null : vocalSummary,
                    postureSummary: 'error' in postureSummary ? null : postureSummary,
                    videoUrl,
                    rawMetrics: {
                        topic: topic,
                        duration: data.duration,
                        wpm,
                        totalWords,
                        fillerCounts,
                        issueCounts: data.issueCounts,
                        pauseCount,
                        wpmHistory,
                        words, // Correctly access words from scope
                        pauseStats: finalPauseStats,
                        audioMetrics: audioResult ? audioResult.stats : undefined,

                        // Pass raw samples for charts
                        volumeSamples: volumeSamples,
                        pitchSamples: pitchSamples,
                        transcript: transcript // Pass transcript for report
                    }
                };

                setSessionSummary(finalSummaryData);

                // Save to GCS asynchronously
                try {
                    await saveSessionToGCS(finalSummaryData);
                } catch (e) {
                    console.error("Failed to save session to GCS:", e);
                }
                // ── Gamification (fire-and-forget) ──────────────────────
                if (user && !('error' in aiSummary)) {
                    (async () => {
                        try {
                            const topics = Object.keys(data.issueCounts ?? {});
                            await saveSession(user.uid, {
                                duration: data.duration,
                                score: Math.round(data.averageScore),
                                topics,
                                wpm,
                                totalWords,
                                aiSummary: (aiSummary as any).summary ?? "",
                                tips: (aiSummary as any).tips ?? [],
                                fillerCounts,
                                pauseCount,
                                wpmHistory,
                                videoUrl: videoUrl,
                                transcript: transcript ?? "",
                                pauseStats: finalPauseStats ?? null,
                                audioMetrics: audioResult?.stats ?? undefined,
                                lectureAnalysis: (aiSummary as any).lectureAnalysis ?? null,
                            });
                            const newStreak = await updateStreak(user.uid);
                            const sessionStats = await getSessionStats(user.uid);

                            const awarded = await checkAndAwardBadges(user.uid, {
                                sessionsCount: sessionStats.sessionsCount,
                                streakCount: newStreak,
                                longestStreak: newStreak,
                                averageScore: Math.round(data.averageScore),
                                postsCount: 0,
                                likesReceived: 0,
                                followersCount: 0,
                                sessionDuration: data.duration,
                                totalPracticeSeconds: sessionStats.totalPracticeSeconds,
                                bestScore: sessionStats.bestScore
                            });

                            if (awarded.length > 0) setNewBadges(awarded);
                        } catch (e) {
                            console.error("Gamification error:", e);
                        }
                    })();
                }
                // ─────────────────────────────────────────────────────────
            } catch (error) {
                console.error("Failed to analyze session:", error);
            } finally {
                setIsAnalyzing(false);
            }

        } else {
            // Start everything
            setSessionSummary(null);

            // Wait for Audio Stream BEFORE starting the flags so MediaRecorder gets it immediately
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setAudioStream(stream);
                startAudioAnalysis(stream);

                // Note: startListening now handles its own AudioContext/WebSocket
                startListening(stream);

                startSession();
                setIsStarted(true); // Trigger UI and recording
            } catch (e) {
                console.error("Audio stream failed", e);
                alert("Please allow microphone access to start the session.");
            }
        }
    };

    const handleReset = () => {
        setIsStarted(false);
        endSession();
        stopListening();
        resetSpeech();
    };


    const [isCoachHovered, setIsCoachHovered] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-black text-white overflow-hidden p-4 gap-4">
            {/* Header */}
            <header className="flex items-center justify-between px-2">
                <Link href="/dashboard/practice/topic" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Change Topic</span>
                </Link>

                <div className="flex items-center gap-2">
                    {topic && (
                        <div className="flex items-center gap-2 bg-purple-500/10 px-4 py-1.5 rounded-full border border-purple-500/20 max-w-xs">
                            <MessageSquareText className="w-4 h-4 text-purple-400 shrink-0" />
                            <span className="text-sm font-medium text-purple-300 truncate">{topic}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold tracking-wide">AI Practice Mode</span>
                    </div>
                </div>
            </header>

            {/* Main Content: Split Layout */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 max-w-7xl mx-auto w-full">

                {/* LEFT PANEL: Video & Transcript */}
                <div className="flex-1 flex flex-col gap-6 min-h-0">

                    {/* Top: Webcam & Coach Widget (Full Width, Fixed Aspect Ratio) */}
                    <div className="w-full aspect-video relative bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col flex-none">
                        <div className="relative flex-1 bg-black">
                            <UnifiedWebcamView
                                onPoseResults={analyzePosture}
                                onFaceResults={analyzeFace}
                                isRecording={isStarted}
                                audioStream={audioStream}
                                onVideoRecorded={handleVideoRecorded}
                            />

                            {/* Feedback Overlay - Facial Only (Posture Alerts Suppressed) */}
                            {isStarted && (
                                <>
                                    <FeedbackOverlay
                                        isNervous={result.isNervous}
                                        isDistracted={result.isDistracted}
                                        emotionState={result.emotionState}
                                        postureMessages={[]} // User requested to remove specific posture alerts
                                    />
                                    {/* End Session Button */}
                                    <div className="absolute top-4 right-4 z-[60]">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleToggleSession}
                                            className="rounded-full shadow-lg flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border-none"
                                        >
                                            <Square className="w-4 h-4 fill-current" />
                                            End Session
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Speech Coach Widget - Floating Bottom Overlay (Reveal on Hover) */}
                            {isStarted && (
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-32 z-[60] flex items-end justify-center pb-6 transition-all"
                                    onMouseEnter={() => setIsCoachHovered(true)}
                                    onMouseLeave={() => setIsCoachHovered(false)}
                                >
                                    <AnimatePresence>
                                        {isCoachHovered && (
                                            <motion.div
                                                key="coach-widget"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 20 }}
                                                transition={{ duration: 0.2 }}
                                                className="pointer-events-auto"
                                            >
                                                <SpeechCoachWidget
                                                    isListening={isListening}
                                                    wpm={wpm}
                                                    elapsedTime={elapsedTime}
                                                    transcript={transcript}
                                                    onToggleListening={isListening ? stopListening : startListening}
                                                    onReset={handleReset}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Start Overlay */}
                            {!isStarted && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4">
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-center space-y-6 max-w-md w-full"
                                    >
                                        <div className="flex justify-center gap-4 mb-2">
                                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                                                <Video className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                                                <Mic className="w-6 h-6 text-purple-400" />
                                            </div>
                                        </div>

                                        <div>
                                            <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">Practice Session</h1>
                                            <p className="text-sm text-gray-400 max-w-xs mx-auto">
                                                Real-time analysis of your posture, expression, and speech pacing.
                                            </p>
                                        </div>

                                        <div className="pt-2 flex justify-center">
                                            <Button
                                                size="lg"
                                                onClick={handleToggleSession}
                                                className="w-full max-w-[200px] text-base h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-purple-900/20 hover:scale-[1.02] transition-all"
                                            >
                                                Start Practice
                                            </Button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom: Transcript (35% Height) */}
                    <div className="flex-1 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-800 p-6 flex flex-col min-h-0 relative">
                        <div className="flex items-center justify-between mb-3 ">
                            <div className="flex items-center gap-2 text-slate-400 uppercase tracking-wider text-xs font-bold">
                                <div className="p-1.5 bg-purple-500/10 rounded-md">
                                    <Mic className="w-3 h-3 text-purple-400" />
                                </div>
                                Live Transcript
                            </div>
                            {isListening && !error && (
                                <div className="flex items-center gap-2 text-[10px] text-purple-400 font-bold animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                    LISTENING
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 rounded-xl bg-slate-950/30 border border-slate-800/50" ref={transcriptRef}>
                            {transcript ? (
                                <p className="text-lg leading-relaxed text-slate-200 whitespace-pre-wrap">
                                    {transcript}
                                    {isListening && <span className="inline-block w-2 h-5 bg-purple-500 ml-1 animate-pulse align-middle rounded-full" />}
                                </p>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic gap-2">
                                    <p>Start speaking to see your speech transcribed here...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Compact Metrics */}
                <div className="w-full lg:w-[480px] flex flex-col gap-6 min-w-0">

                    {/* Unified Feedback Panel */}
                    <div className="flex-1 min-h-[450px]">
                        <UnifiedFeedbackPanel
                            pitch={currentPitch}
                            wpm={wpm}
                            volume={currentVolume}
                            isListening={isListening}
                            postureScore={result.posture.score}
                            isPostureStable={result.posture.isStable}
                            postureIssues={result.posture.issues}
                        />
                    </div>
                </div>
            </div>
            {/* Loading State Overlay */}
            {isAnalyzing && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-blue-300 font-bold animate-pulse">Generating AI Summary...</p>
                </div>
            )}

            {/* Badge Award Toast */}
            <AnimatePresence>
                {newBadges.length > 0 && (
                    <motion.div
                        key="badge-award-toast"
                        initial={{ opacity: 0, y: -60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -60 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2"
                    >
                        {newBadges.map(id => {
                            const def = BADGE_DEFINITIONS.find(d => d.id === id);
                            if (!def) return null;
                            return (
                                <div key={id} className="flex items-center gap-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/40 rounded-2xl px-5 py-3 shadow-2xl shadow-yellow-900/30 backdrop-blur-md">
                                    <span className="text-3xl">{def.icon}</span>
                                    <div>
                                        <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest">Badge Unlocked!</p>
                                        <p className="text-white font-semibold">{def.name}</p>
                                    </div>
                                    <button onClick={() => setNewBadges(p => p.filter(b => b !== id))} className="ml-2 text-white/40 hover:text-white text-lg">✕</button>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gemini AI Coach Summary - Full Screen Modal */}
            <AnimatePresence>
                {sessionSummary && (
                    <motion.div
                        key="session-summary-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 overflow-y-auto"
                    >
                        <div className="w-full max-w-4xl my-auto flex justify-center">
                            <DetailedSessionReport
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

export default function PracticePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <PracticePageInner />
        </Suspense>
    );
}

"use client";

export const maxDuration = 60;

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { UnifiedWebcamView } from "@/components/analysis/UnifiedWebcamView";
import { useUnifiedAnalysis } from "@/hooks/useUnifiedAnalysis";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { SpeechCoachWidget } from "@/components/coach/SpeechCoachWidget";
import { FeedbackOverlay } from "@/components/analysis/FeedbackOverlay";

import { UnifiedFeedbackPanel } from "@/components/analysis/UnifiedFeedbackPanel";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Video, Mic, Square, AlertTriangle, MessageSquareText, UploadCloud, FileText, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { DetailedSessionReport } from "@/components/analysis/DetailedSessionReport";
import { analyzePresentation } from "@/app/actions/analyzePresentation";
import { generateQnA } from "@/app/actions/generateQnA";
import { evaluateQnA } from "@/app/actions/evaluateQnA";
import { speakText, stopSpeaking } from "@/lib/tts-client";
import { analyzeVocal } from "@/app/actions/analyzeVocal";
import { analyzePosture as getAIPostureAnalysis } from "@/app/actions/analyzePosture";
import { saveSessionToGCS, getGCSUploadUrl } from "@/app/actions/saveSession";
import { useAuth } from "@/contexts/AuthContext";
import { saveSession, getSessionStats } from "@/lib/sessions";
import { getUserStreak } from "@/lib/streak";
import { checkAndAwardBadges, BADGE_DEFINITIONS } from "@/lib/badges";
// ...

function PresentationPageInner() {
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
        words,
        pauseRecording,
        resumeRecording
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
    const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

    // Presentation specific state
    const [slideFile, setSlideFile] = useState<{ name: string, type: string } | null>(null);
    const [hasRubric, setHasRubric] = useState(false);
    const [rubricFile, setRubricFile] = useState<{ name: string, type: string } | null>(null);
    const [slideBase64, setSlideBase64] = useState<string | null>(null);
    const [rubricBase64, setRubricBase64] = useState<string | null>(null);

    // PiP Slide Viewer State
    const [isSlidesExpanded, setIsSlidesExpanded] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Q&A State Machine
    type PresentationPhase = 'SETUP' | 'PRESENTING' | 'GENERATING_QNA' | 'QNA_ACTIVE' | 'EVALUATING';
    const [phase, setPhase] = useState<PresentationPhase>('SETUP');
    const [qnaQuestions, setQnaQuestions] = useState<string[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [qnaAnswers, setQnaAnswers] = useState<string[]>([]);
    const [isQnaExpanded, setIsQnaExpanded] = useState(false);
    const [presentationSnapshot, setPresentationSnapshot] = useState<any>(null);

    const playPopupSound = useCallback(() => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Google meet style "bloop" (high pitch quick drop)
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    }, []);

    // Load from sessionStorage on mount
    useEffect(() => {
        let objectUrl: string | null = null;

        const storedSlideB64 = sessionStorage.getItem("presentation_slide_b64");
        const storedSlideType = sessionStorage.getItem("presentation_slide_type");
        const storedSlideName = sessionStorage.getItem("presentation_slide_name");

        if (storedSlideB64) {
            setSlideBase64(storedSlideB64);
            setSlideFile({
                name: storedSlideName || "slides.pdf",
                type: storedSlideType || "application/pdf"
            });

            // Only create PDF viewer URL if it's actually a PDF
            if (storedSlideType === "application/pdf" || storedSlideName?.toLowerCase().endsWith(".pdf")) {
                try {
                    const byteCharacters = atob(storedSlideB64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: "application/pdf" });
                    objectUrl = URL.createObjectURL(blob);
                    setPdfUrl(objectUrl);
                } catch (e) {
                    console.error("Failed to create PDF blob URL", e);
                }
            }
        }

        const storedRubricB64 = sessionStorage.getItem("presentation_rubric_b64");
        const storedRubricType = sessionStorage.getItem("presentation_rubric_type");
        const storedRubricName = sessionStorage.getItem("presentation_rubric_name");

        if (storedRubricB64) {
            setHasRubric(true);
            setRubricBase64(storedRubricB64);
            setRubricFile({
                name: storedRubricName || "rubric.pdf",
                type: storedRubricType || "application/pdf"
            });
        }

        // Cleanup object URL on unmount
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, []);

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

    // Toggle Session Flow
    const handleStartSession = async () => {
        setSessionSummary(null);
        setPhase('PRESENTING');

        // Wait for Audio Stream BEFORE starting the flags so MediaRecorder gets it immediately
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);
            startAudioAnalysis(stream);

            // Note: startListening now handles its own AudioContext/WebSocket
            startListening();

            startSession();
            setSessionStartTime(new Date().toISOString());
            setIsStarted(true); // Trigger UI and recording
        } catch (e) {
            console.error("Audio stream failed", e);
            alert("Please allow microphone access to start the session.");
            setPhase('SETUP');
        }
    };

    const handleStartQnA = async () => {
        setPhase('GENERATING_QNA');
        const questionsResponse = await generateQnA({
            transcript,
            slideData: slideBase64 ? { base64: slideBase64, type: slideFile?.type, name: slideFile?.name } : undefined
        });

        if (!questionsResponse || 'error' in questionsResponse || !Array.isArray(questionsResponse)) {
            console.error("Failed to generate QnA", questionsResponse);
            // Fallback to finishing session immediately if QnA fails
            handleFinishSession([]);
            return;
        }

        const questions = questionsResponse as string[];
        setQnaQuestions(questions);
        setCurrentQIndex(0);
        setQnaAnswers([]);
        setPhase('QNA_ACTIVE');

        // Snapshot presentation metrics before clearing for Q&A
        setPresentationSnapshot({
            transcript,
            totalWords,
            fillerCounts,
            wpmHistory,
            pauseCount,
            pauseStats,
            words,
            audioStats: { ...audioStats },
            volumeSamples: [...volumeSamples],
            pitchSamples: [...pitchSamples],
            duration: elapsedTime
        });

        playPopupSound();
        resetSpeech(); // Clear transcript to cleanly record the answer

        playPopupSound();
        resetSpeech(); // Clear transcript to cleanly record the answer

        // Use high-quality TTS from the tts-client
        pauseRecording?.();
        speakText(questions[0]).then(() => {
            resumeRecording?.();
        });
    };

    const handleNextQuestion = () => {
        const currentAnswer = transcript.trim() || "(No audible answer recorded)";
        setQnaAnswers(prev => [...prev, currentAnswer]);

        if (currentQIndex < qnaQuestions.length - 1) {
            const nextIdx = currentQIndex + 1;
            setCurrentQIndex(nextIdx);
            resetSpeech();
            setIsQnaExpanded(true);
            playPopupSound();

            pauseRecording?.();
            speakText(qnaQuestions[nextIdx]).then(() => {
                resumeRecording?.();
            });
        } else {
            handleFinishSession([...qnaAnswers, currentAnswer]);
        }
    };

    const handleFinishSession = async (finalAnswers: string[]) => {
        if (!user) {
            console.error("Session finish attempted without user context");
            return;
        }
        stopSpeaking();
        setIsStarted(false);
        setPhase('EVALUATING');
        setIsAnalyzing(true);
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

            const audioResult = audioStats;
            const finalPauseStats = pauseStats;

            const speechMetricsPayload = {
                totalWords,
                fillerCounts,
                // @ts-ignore - pauseStats structure mismatch check
                pauseStats: finalPauseStats ? finalPauseStats.stats : undefined,
                pauseCount,
                wpmHistory
            };

            let videoUrl = undefined;
            if (videoBlob.size > 0) {
                try {
                    const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
                    const fileId = Date.now().toString();
                    const res = await getGCSUploadUrl(videoBlob.type, ext, user.uid, fileId);
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

            const audioMetricsPayload = audioResult ? audioResult.stats : undefined;

            // Use snapshot for the "Main" analysis if Q&A happened
            const reportTranscript = presentationSnapshot ? presentationSnapshot.transcript : transcript;
            const reportDuration = presentationSnapshot ? presentationSnapshot.duration : data.duration;
            const reportSpeechMetrics = presentationSnapshot ? {
                totalWords: presentationSnapshot.totalWords,
                fillerCounts: presentationSnapshot.fillerCounts,
                pauseStats: presentationSnapshot.pauseStats ? presentationSnapshot.pauseStats.stats : undefined,
                pauseCount: presentationSnapshot.pauseCount,
                wpmHistory: presentationSnapshot.wpmHistory
            } : speechMetricsPayload;

            const reportAudioMetrics = (presentationSnapshot && presentationSnapshot.audioStats)
                ? presentationSnapshot.audioStats.stats
                : audioMetricsPayload;

            const qnaPairs = qnaQuestions.map((q, i) => ({
                question: q,
                userAnswer: finalAnswers[i] || "(No audible answer recorded)"
            }));

            const [aiSummary, vocalSummary, postureSummary, qnaEvals] = await Promise.all([
                analyzePresentation({
                    duration: reportDuration,
                    averageScore: data.averageScore,
                    issueCounts: data.issueCounts,
                    faceMetrics: data.faceMetrics,
                    topic: topic,
                    transcript: reportTranscript,
                    speechMetrics: reportSpeechMetrics,
                    // @ts-ignore
                    audioMetrics: reportAudioMetrics,
                    // Presentation specific data
                    slideData: slideBase64 ? { base64: slideBase64, type: slideFile?.type, name: slideFile?.name } : undefined,
                    rubricData: hasRubric && rubricBase64 ? { base64: rubricBase64, type: rubricFile?.type, name: rubricFile?.name } : undefined
                }),
                analyzeVocal({
                    speechMetrics: reportSpeechMetrics,
                    // @ts-ignore
                    audioMetrics: reportAudioMetrics
                }),
                getAIPostureAnalysis({
                    issueCounts: data.issueCounts,
                    faceMetrics: data.faceMetrics
                }),
                qnaPairs.length > 0 ? evaluateQnA({
                    qnaPairs,
                    slideData: slideBase64 ? { base64: slideBase64, type: slideFile?.type, name: slideFile?.name } : undefined
                }) : Promise.resolve([])
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
                qnaSummary: Array.isArray(qnaEvals) ? qnaPairs.map((p, i) => ({ ...p, ...qnaEvals[i] })) : null,
                videoUrl,
                rawMetrics: {
                    topic: topic,
                    duration: reportDuration,
                    wpm: presentationSnapshot ? Math.round((presentationSnapshot.totalWords / Math.max(1, presentationSnapshot.duration)) * 60) : wpm,
                    totalWords: presentationSnapshot ? presentationSnapshot.totalWords : totalWords,
                    fillerCounts: presentationSnapshot ? presentationSnapshot.fillerCounts : fillerCounts,
                    issueCounts: data.issueCounts,
                    pauseCount: presentationSnapshot ? presentationSnapshot.pauseCount : pauseCount,
                    wpmHistory: presentationSnapshot ? presentationSnapshot.wpmHistory : wpmHistory,
                    words: presentationSnapshot ? presentationSnapshot.words : words, // Correctly access words from scope
                    pauseStats: presentationSnapshot ? presentationSnapshot.pauseStats : finalPauseStats,
                    audioMetrics: reportAudioMetrics,

                    // Pass raw samples for charts
                    volumeSamples: presentationSnapshot ? presentationSnapshot.volumeSamples : volumeSamples,
                    pitchSamples: presentationSnapshot ? presentationSnapshot.pitchSamples : pitchSamples,
                    transcript: reportTranscript // Pass transcript for report
                }
            };

            setSessionSummary(finalSummaryData);

            // Save to GCS asynchronously
            try {
                await saveSessionToGCS(finalSummaryData, user.uid, Date.now().toString(), sessionStartTime || new Date().toISOString());
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
                            transcript: reportTranscript ?? "",
                            pauseStats: presentationSnapshot ? presentationSnapshot.pauseStats : (finalPauseStats ?? null),
                            audioMetrics: (presentationSnapshot && presentationSnapshot.audioStats) ? presentationSnapshot.audioStats.stats : (audioResult?.stats ?? undefined),
                            // Save extra metrics as custom data if needed, or update DB schema later
                        });
                        const streakData = await getUserStreak(user.uid);
                        const newStreak = streakData?.currentStreak || 0;
                        const sessionStats = await getSessionStats(user.uid);

                        const awarded = await checkAndAwardBadges(user.uid, {
                            sessionsCount: sessionStats.sessionsCount,
                            streakCount: newStreak,
                            longestStreak: newStreak, // Fallback to current if longest not tracked separately here
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
            setPhase('SETUP');
        }
    };

    const handleReset = () => {
        stopSpeaking();
        setIsStarted(false);
        setPhase('SETUP');
        endSession();
        stopListening();
        resetSpeech();
    };


    const [isCoachHovered, setIsCoachHovered] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-black text-white overflow-hidden p-4 gap-4">
            {/* Header */}
            <header className="flex items-center justify-between px-2">
                <Link href="/dashboard" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Dashboard</span>
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
                        <span className="text-sm font-semibold tracking-wide">AI Presentation Mode</span>
                    </div>
                </div>
            </header>

            {/* Main Content: Split Layout */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 max-w-7xl mx-auto w-full">

                {/* LEFT PANEL: Video & Transcript */}
                <div className="flex-1 flex flex-col gap-6 min-h-0">

                    {/* Top: Webcam & Coach Widget (Full Width, Fixed Aspect Ratio OR PiP Mode) */}
                    <div className={`w-full relative bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col flex-none transition-all duration-500 ease-in-out ${isSlidesExpanded ? 'h-[65vh]' : 'aspect-video'}`}>

                        {/* Slide Webview Layer */}
                        {isSlidesExpanded && pdfUrl && (
                            <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
                                <iframe
                                    src={`${pdfUrl}#toolbar=0&navpanes=0`}
                                    className="w-full h-full border-none"
                                    title="Presentation Slides"
                                />
                            </div>
                        )}

                        {/* Webcam Layer (Shrinks into PiP when expanded) */}
                        <div className={`bg-black transition-all duration-500 ease-in-out ${isSlidesExpanded ? 'absolute bottom-3 right-4 w-56 aspect-video z-50 rounded-2xl shadow-2xl border-2 border-slate-700/80 overflow-hidden' : 'relative flex-1'}`}>
                            <UnifiedWebcamView
                                onPoseResults={analyzePosture}
                                onFaceResults={analyzeFace}
                                isRecording={isStarted}
                                audioStream={audioStream}
                                onVideoRecorded={handleVideoRecorded}
                            />

                            {/* Feedback Overlay - Facial Only */}
                            {isStarted && !isSlidesExpanded && phase === 'PRESENTING' && (
                                <>
                                    <FeedbackOverlay
                                        isNervous={result.isNervous}
                                        isDistracted={result.isDistracted}
                                        emotionState={result.emotionState}
                                        postureMessages={[]}
                                    />
                                </>
                            )}
                        </div>

                        {/* Q&A Notification Bubble */}
                        <AnimatePresence>
                            {phase === 'QNA_ACTIVE' && qnaQuestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className={`absolute left-4 top-4 z-[70] flex flex-col items-start max-w-sm transition-all duration-300`}
                                >
                                    <div
                                        onMouseEnter={() => setIsQnaExpanded(true)}
                                        onMouseLeave={() => setIsQnaExpanded(false)}
                                        onClick={() => setIsQnaExpanded(!isQnaExpanded)}
                                        className={`bg-slate-900/95 backdrop-blur-xl border-2 border-purple-500/50 rounded-2xl p-4 shadow-[0_0_40px_rgba(168,85,247,0.3)] cursor-pointer transition-all ${isQnaExpanded ? 'hover:bg-slate-800' : 'hover:scale-105'}`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-400/30">
                                                <MessageSquareText className="w-3.5 h-3.5 text-purple-400" />
                                            </div>
                                            <h3 className="text-[10px] font-bold text-purple-300 uppercase tracking-[0.2em]">
                                                Question {currentQIndex + 1}/{qnaQuestions.length}
                                            </h3>
                                        </div>
                                        <AnimatePresence>
                                            {isQnaExpanded ? (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <p className="text-base font-serif leading-relaxed text-white">
                                                        {qnaQuestions[currentQIndex]}
                                                    </p>
                                                </motion.div>
                                            ) : (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="text-[10px] text-slate-400 mt-1 italic"
                                                >
                                                    Hover to expand...
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Controls Overlay (Always on top of video or slides) */}
                        {isStarted && (
                            <div className="absolute top-4 right-4 z-[60] flex items-center gap-3">
                                {pdfUrl && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setIsSlidesExpanded(!isSlidesExpanded)}
                                        className="rounded-full shadow-lg flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-600/50 backdrop-blur-md transition-all"
                                    >
                                        {isSlidesExpanded ? (
                                            <>
                                                <Minimize2 className="w-4 h-4" />
                                                Hide Slides
                                            </>
                                        ) : (
                                            <>
                                                <Maximize2 className="w-4 h-4" />
                                                View Slides
                                            </>
                                        )}
                                    </Button>
                                )}

                                {phase === 'PRESENTING' && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleStartQnA}
                                        className="rounded-full shadow-lg flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-none transition-all"
                                    >
                                        <Sparkles className="w-4 h-4 text-purple-200" />
                                        Start Q&A
                                    </Button>
                                )}

                                {phase === 'GENERATING_QNA' && (
                                    <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-purple-500/30 backdrop-blur-md">
                                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm font-medium text-purple-300">Generating Questions...</span>
                                    </div>
                                )}

                                {phase === 'QNA_ACTIVE' && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleNextQuestion}
                                        className={`rounded-full shadow-lg flex items-center gap-2 text-white border-none transition-all ${currentQIndex === qnaQuestions.length - 1 ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                                    >
                                        {currentQIndex === qnaQuestions.length - 1 ? (
                                            <>
                                                <Square className="w-4 h-4 fill-current" />
                                                End Session
                                            </>
                                        ) : (
                                            "Next Question ➔"
                                        )}
                                    </Button>
                                )}
                            </div>
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
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-center space-y-6 max-w-md w-full bg-slate-900/80 p-8 rounded-3xl border border-slate-700/50 shadow-2xl"
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
                                        <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">Presentation Session</h1>
                                        <p className="text-sm text-gray-400 mx-auto mb-4">
                                            Real-time analysis of your posture, expression, and speech pacing.
                                        </p>
                                    </div>

                                    {/* Setup Options Panel (Minimal) */}
                                    <div className="flex-1 w-full flex flex-col justify-center items-center text-center relative pointer-events-auto">

                                        <div className="flex items-center gap-3 mb-4 text-slate-300 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 shadow-xl backdrop-blur-sm">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                            <span className="text-sm font-medium">Ready</span>

                                            <div className="w-px h-4 bg-slate-700 mx-1"></div>

                                            {slideFile && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                                                    <span className="truncate max-w-[120px]" title={slideFile.name}>{slideFile.name}</span>
                                                </div>
                                            )}

                                            {rubricFile && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
                                                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                                                    <span className="truncate max-w-[120px]" title={rubricFile.name}>{rubricFile.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            size="lg"
                                            onClick={handleStartSession}
                                            className="h-10 px-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all font-semibold"
                                        >
                                            Start Presentation
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
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
            {
                isAnalyzing && (
                    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-blue-300 font-bold animate-pulse">Generating AI Summary...</p>
                    </div>
                )
            }

            {/* Badge Award Toast */}
            <AnimatePresence>
                {newBadges.length > 0 && (
                    <motion.div
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 overflow-y-auto"
                    >
                        <div className="w-full max-w-4xl my-auto flex justify-center">
                            <DetailedSessionReport
                                data={{
                                    summary: sessionSummary.summary || "No summary available.",
                                    tips: sessionSummary.tips || [],
                                    score: sessionSummary.score || 0,
                                    topicAnalysis: sessionSummary.topicAnalysis || null,
                                    vocalSummary: sessionSummary.vocalSummary || null,
                                    postureSummary: sessionSummary.postureSummary || null,
                                    qnaSummary: sessionSummary.qnaSummary || null,
                                    slideAnalysis: sessionSummary.slideAnalysis || null,
                                    rubricAnalysis: sessionSummary.rubricAnalysis || null,
                                    videoUrl: sessionSummary.videoUrl,
                                    rawMetrics: sessionSummary.rawMetrics
                                }}
                                onClose={() => setSessionSummary(null)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

export default function PresentationPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <PresentationPageInner />
        </Suspense>
    );
}
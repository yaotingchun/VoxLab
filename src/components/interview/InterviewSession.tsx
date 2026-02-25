"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    Mic,
    MicOff,
    SkipForward,
    Volume2,
    Send,
    Loader2,
    User,
    Bot,
    Clock,
    MessageSquare,
    ChevronRight,
    AlertTriangle,
    Sparkles,
    ArrowRight,
    ArrowLeft,
} from "lucide-react";
import type { InterviewQuestion, InterviewAnswer } from "@/types/interview";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useUnifiedAnalysis } from "@/hooks/useUnifiedAnalysis";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { FeedbackOverlay } from "@/components/analysis/FeedbackOverlay";
import { speakText, stopSpeaking } from "@/lib/tts-client";
import { UnifiedWebcamView } from "@/components/analysis/UnifiedWebcamView";

interface InterviewSessionProps {
    questions: InterviewQuestion[];
    currentQuestionIndex: number;
    interviewerIntro: string;
    roleSummary: string;
    isFollowUp: boolean;
    currentFollowUp: string | null;
    isSpeaking: boolean;
    generatingFollowUp: boolean;
    answers: InterviewAnswer[];
    onSubmitAnswer: (answer: string, visualMetrics: any, vocalMetrics: any) => void;
    onSkip: (visualMetrics: any, vocalMetrics: any) => void;
    onSpeakQuestion: (text?: string) => Promise<void>;
    onSpeakIntro: () => Promise<void>;
    onEnd: (visualMetrics: any, vocalMetrics: any) => void;
}

const QUESTION_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    icebreaker: { label: "Ice Breaker", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
    behavioral: { label: "Behavioral", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    technical: { label: "Technical", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    situational: { label: "Situational", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
    closing: { label: "Closing", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
};

export default function InterviewSession({
    questions,
    currentQuestionIndex,
    interviewerIntro,
    roleSummary,
    isFollowUp,
    currentFollowUp,
    isSpeaking,
    generatingFollowUp,
    answers,
    onSubmitAnswer,
    onSkip,
    onSpeakQuestion,
    onSpeakIntro,
    onEnd,
}: InterviewSessionProps) {
    // ── Hooks ───────────────────────────────────────────────────────────────
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
        resetTranscriptOnly,
        pauseRecording,
        resumeRecording,
        pauseStats,
        words: speechWords,
        error: speechError,
    } = useSpeechRecognition();

    const {
        result: analysisResult,
        analyzePosture,
        analyzeFace,
        startSession: startUnifiedSession,
        endSession: endUnifiedSession,
        getSnapshot: getUnifiedSnapshot,
    } = useUnifiedAnalysis();

    const {
        startAudioAnalysis,
        stopAudioAnalysis,
        pauseAnalysis,
        resumeAnalysis,
        audioStats,
        volumeSamples,
        pitchSamples,
    } = useAudioAnalysis();

    const [showIntro, setShowIntro] = useState(answers.length === 0);
    const [isIntroSpeechDone, setIsIntroSpeechDone] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [answerTimer, setAnswerTimer] = useState(0);
    const [hasSpoken, setHasSpoken] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);
    const prevQuestionIndex = useRef(-1);
    const introPlayedRef = useRef(false);

    // Answer segment tracking for continuous vocal analysis
    const answerSegmentsRef = useRef<{ startTime: number; endTime: number; questionIndex: number }[]>([]);
    const segmentStartRef = useRef<number>(0);

    const currentQ = questions[currentQuestionIndex];
    const questionDisplay = isFollowUp ? currentFollowUp : currentQ?.question;
    const typeInfo = QUESTION_TYPE_LABELS[currentQ?.type || "icebreaker"];
    const progress = ((currentQuestionIndex + (isFollowUp ? 0.5 : 0)) / questions.length) * 100;

    // ── Setup Sessions ───────────────────────────────────────────────────────
    useEffect(() => {
        // Start camera-based analysis as soon as component mounts
        startUnifiedSession();

        // Get audio stream for volume/pitch analysis
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                setAudioStream(stream);
                startAudioAnalysis(stream).then(() => {
                    // Start paused until user actually starts recording an answer
                    pauseAnalysis();
                });
            })
            .catch(err => console.error("Could not get audio stream for analysis:", err));

        return () => {
            stopAudioAnalysis();
            // Note: endUnifiedSession is called manually on completion to get data
        };
    }, []);

    // Start/stop speech recognition based on isStarted
    // startListening is now session-aware: it preserves cumulative metrics on reconnect
    useEffect(() => {
        if (isStarted) {
            startListening(audioStream || undefined);
            // Also resume audio analysis if it was paused
            resumeAnalysis();
        } else {
            stopListening();
            pauseAnalysis(); // Pause analysis when not started
        }
    }, [isStarted, startListening, stopListening, audioStream, resumeAnalysis, pauseAnalysis]);

    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript]);

    // Handle intro
    useEffect(() => {
        if (showIntro && interviewerIntro && !introPlayedRef.current) {
            introPlayedRef.current = true;
            onSpeakIntro().then(() => {
                setIsIntroSpeechDone(true);
            });
        }
    }, [showIntro, interviewerIntro, onSpeakIntro]);

    // When question changes, speak it
    useEffect(() => {
        if (showIntro) return;
        if (prevQuestionIndex.current === currentQuestionIndex && !isFollowUp) return;
        prevQuestionIndex.current = currentQuestionIndex;

        // Reset UI for new question (keep cumulative vocal metrics)
        setIsRecording(false);
        setAnswerTimer(0);
        setHasSpoken(false);
        resetTranscriptOnly();

        if (timerRef.current) clearInterval(timerRef.current);

        // Speak the question
        const text = isFollowUp ? currentFollowUp : currentQ?.question;
        if (text) {
            onSpeakQuestion(text);
        }
    }, [currentQuestionIndex, showIntro, isFollowUp, currentFollowUp, currentQ?.question, onSpeakQuestion, resetTranscriptOnly]);


    // Answer timer
    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setAnswerTimer((t) => t + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    const handleStartRecording = useCallback(() => {
        stopSpeaking(); // Stop TTS if still speaking
        setIsRecording(true);
        setIsStarted(true); // Start speech recognition and analysis
        setAnswerTimer(0);
        segmentStartRef.current = Date.now(); // Mark segment start
    }, [stopSpeaking]);

    const handleStopRecording = () => {
        if (!isStarted) return;
        setIsStarted(false);
        stopListening();
        pauseAnalysis(); // Pause samples but don't stop the processor
        setHasSpoken(true);
    };

    const handleCollectMetrics = useCallback((isFinal: boolean) => {
        // Record the answer segment end time
        if (segmentStartRef.current > 0) {
            answerSegmentsRef.current.push({
                startTime: segmentStartRef.current,
                endTime: Date.now(),
                questionIndex: currentQuestionIndex
            });
            segmentStartRef.current = 0;
        }

        // Calculate total speaking duration from segments (excludes interviewer gaps)
        const totalSpeakingDuration = answerSegmentsRef.current.reduce(
            (sum, seg) => sum + (seg.endTime - seg.startTime), 0
        ) / 1000;

        // Visual metrics: snapshot for intermediate, full end for final
        const unifiedData = isFinal ? endUnifiedSession() : getUnifiedSnapshot();
        const audioResult = audioStats;

        const visualMetrics = {
            issueCounts: unifiedData.issueCounts,
            faceMetrics: unifiedData.faceMetrics,
            rawMetrics: {
                issueCounts: unifiedData.issueCounts,
            }
        };

        const vocalMetrics = {
            speechMetrics: {
                totalWords,
                fillerCounts,
                pauseCount,
                wpmHistory,
                pauseStats: pauseStats?.stats,
                totalSpeakingDuration,
                answerSegments: [...answerSegmentsRef.current],
            },
            audioMetrics: audioResult?.stats,
            rawMetrics: {
                duration: totalSpeakingDuration,
                wpm: totalSpeakingDuration > 0 ? Math.round((totalWords / totalSpeakingDuration) * 60) : wpm,
                totalWords,
                fillerCounts,
                pauseCount,
                wpmHistory,
                words: speechWords,
                pauseStats,
                audioMetrics: audioResult?.stats,
                volumeSamples,
                pitchSamples,
                transcript,
                answers,
            }
        };

        return { visualMetrics, vocalMetrics };
    }, [
        currentQuestionIndex,
        endUnifiedSession,
        getUnifiedSnapshot,
        audioStats,
        totalWords,
        fillerCounts,
        pauseCount,
        wpmHistory,
        pauseStats,
        wpm,
        speechWords,
        volumeSamples,
        pitchSamples,
        transcript
    ]);

    const handleSubmit = useCallback(async () => {
        if (!transcript.trim()) return;
        stopSpeaking();
        setIsStarted(false);

        // Check if this is the last question
        const isLastQuestion = currentQuestionIndex + 1 >= questions.length;
        const { visualMetrics, vocalMetrics } = handleCollectMetrics(isLastQuestion);
        await onSubmitAnswer(transcript, visualMetrics, vocalMetrics);

        // Only clear transcript for next question; keep cumulative metrics
        if (isLastQuestion) {
            resetSpeech();
        } else {
            resetTranscriptOnly();
        }
    }, [transcript, onSubmitAnswer, resetSpeech, resetTranscriptOnly, handleCollectMetrics, currentQuestionIndex, questions.length]);

    const handleSkip = useCallback(() => {
        stopSpeaking();
        setIsStarted(false);

        const isLastQuestion = currentQuestionIndex + 1 >= questions.length;
        const { visualMetrics, vocalMetrics } = handleCollectMetrics(isLastQuestion);
        onSkip(visualMetrics, vocalMetrics);

        if (isLastQuestion) {
            resetSpeech();
        } else {
            resetTranscriptOnly();
        }
    }, [onSkip, resetSpeech, resetTranscriptOnly, handleCollectMetrics, currentQuestionIndex, questions.length]);


    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // ── Intro Screen ─────────────────────────────────────────────────────────
    if (showIntro) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6 max-w-lg"
                >
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center border border-blue-500/20">
                        <Bot className="w-10 h-10 text-blue-400" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Starting Your Interview</h2>
                        <p className="text-slate-400 text-sm">{roleSummary}</p>
                    </div>

                    <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800">
                        <p className="text-slate-200 text-sm leading-relaxed italic">
                            &ldquo;{interviewerIntro}&rdquo;
                        </p>
                    </div>

                    {isSpeaking ? (
                        <div className="flex items-center justify-center gap-2 text-blue-400">
                            <Volume2 className="w-4 h-4 animate-pulse" />
                            <span className="text-sm">Interviewer is speaking...</span>
                        </div>
                    ) : isIntroSpeechDone && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-center w-full mt-2"
                        >
                            <button
                                onClick={() => setShowIntro(false)}
                                className="group flex items-center gap-2.5 px-7 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm tracking-wide shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 transition-all duration-300 hover:scale-[1.03]"
                            >
                                Ready to Start
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        );
    }

    // ── Generating Follow-Up Screen ──────────────────────────────────────────
    if (generatingFollowUp) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-4"
                >
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                    <p className="text-slate-300 text-sm">The interviewer is thinking...</p>
                </motion.div>
            </div>
        );
    }

    // ── Main Interview UI ────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-black text-white p-4 gap-4">
            {/* Header */}
            <header className="flex items-center justify-between px-2 flex-shrink-0">
                <div />

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold tracking-wide text-slate-200">AI Mock Interview</span>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full min-h-0">
                {/* LEFT PANEL: Camera & Controls */}
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    {/* Top Control Bar */}
                    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${typeInfo.bg} ${typeInfo.color}`}>
                                {isFollowUp ? "Follow-up" : typeInfo.label}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight leading-none mb-1">Session Progress</span>
                                <span className="text-sm text-slate-200 font-semibold space-x-1">
                                    <span>Question</span>
                                    <span className="text-blue-400 font-bold">{currentQuestionIndex + 1}</span>
                                    <span className="text-slate-500">of</span>
                                    <span>{questions.length}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 max-w-[180px] mx-6">
                            <div className="w-full bg-slate-800 rounded-full h-1">
                                <motion.div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSkip}
                                className="rounded-full bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white h-9 px-4 transition-all"
                            >
                                Skip question
                            </Button>
                        </div>
                    </div>

                    {/* Camera Container */}
                    <div className="w-full aspect-video relative bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col flex-none">
                        <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
                            <UnifiedWebcamView
                                onPoseResults={analyzePosture}
                                onFaceResults={analyzeFace}
                                isRecording={isStarted}
                            />

                            {/* Feedback Overlay */}
                            {isStarted && (
                                <FeedbackOverlay
                                    isNervous={analysisResult.isNervous}
                                    isDistracted={analysisResult.isDistracted}
                                    emotionState={analysisResult.emotionState}
                                    postureMessages={[]} // Don't show posture toast in interview to avoid distraction?
                                />
                            )}

                            {/* Floating Question Popup */}
                            <AnimatePresence>
                                {isSpeaking && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                        className="absolute top-6 left-6 right-6 z-[70]"
                                    >
                                        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl overflow-hidden relative group">
                                            {/* Accent Gradient */}
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500/80 to-purple-500/80" />

                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Bot className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                            {isFollowUp ? "Follow-up Question" : typeInfo.label}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-blue-400">
                                                            <div className="flex gap-0.5">
                                                                {[1, 2, 3].map((i) => (
                                                                    <motion.div
                                                                        key={i}
                                                                        animate={{ height: [4, 10, 4] }}
                                                                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                                                        className="w-0.5 bg-blue-400/60 rounded-full"
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] font-bold uppercase tracking-tighter opacity-80">Speaking</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-base text-white leading-relaxed font-medium">
                                                        {questionDisplay}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Controls Toolbar */}
                    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 shadow-inner">
                        <div className="flex items-center justify-between">
                            {/* Left: Input Mode Status */}
                            <div className="flex items-center gap-5">
                                <div className="flex items-center gap-4">
                                    <Button
                                        size="lg"
                                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                                        className={`rounded-full w-14 h-14 p-0 transition-all duration-300 ${isRecording
                                            ? "bg-red-600 hover:bg-red-700 shadow-xl shadow-red-900/40 scale-105"
                                            : "bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-900/40 hover:scale-105"
                                            }`}
                                    >
                                        {isRecording ? (
                                            <MicOff className="w-6 h-6" />
                                        ) : (
                                            <Mic className="w-6 h-6" />
                                        )}
                                    </Button>
                                    <div className="flex flex-col justify-center">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider leading-none mb-1.5">Voice Input</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-semibold transition-colors ${isRecording ? 'text-red-400' : 'text-slate-400'}`}>
                                                {isRecording ? "Listening..." : "Ready to speak"}
                                            </span>
                                            {isRecording && (
                                                <div className="flex items-center gap-0.5 h-3">
                                                    {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                                                        <motion.div
                                                            key={i}
                                                            animate={{
                                                                height: [4, 12, 4],
                                                                opacity: [0.5, 1, 0.5]
                                                            }}
                                                            transition={{
                                                                repeat: Infinity,
                                                                duration: 0.6,
                                                                delay: i * 0.1,
                                                                ease: "easeInOut"
                                                            }}
                                                            className="w-0.5 bg-red-400 rounded-full"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Action Buttons Group */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={handleSkip}
                                    className="h-11 px-6 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-all"
                                >
                                    <SkipForward className="w-4 h-4 mr-2" />
                                    Skip
                                </Button>

                                <Button
                                    size="lg"
                                    disabled={!transcript.trim()}
                                    onClick={handleSubmit}
                                    className="h-11 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-20 disabled:grayscale font-bold text-sm shadow-lg shadow-purple-900/20 transition-all flex items-center"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Answer
                                    <ChevronRight className="w-4 h-4 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Answer Area & Transcript */}
                <div className="w-full lg:w-[480px] flex flex-col gap-6 min-w-0">
                    <div className="flex-1 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-500/10 rounded-md">
                                    <User className="w-3.5 h-3.5 text-purple-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Your Answer
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                {isRecording && (
                                    <div className="flex items-center gap-2 text-purple-400 text-xs">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        <Clock className="w-3 h-3" />
                                        {formatTime(answerTimer)}
                                    </div>
                                )}
                                {isRecording && wpm > 0 && (
                                    <span className="text-xs text-slate-500">{wpm} WPM</span>
                                )}
                            </div>
                        </div>

                        {speechError && (
                            <div className="mb-3 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {speechError}
                            </div>
                        )}

                        {/* Answer Content */}
                        <div
                            ref={transcriptRef}
                            className="flex-1 overflow-y-auto custom-scrollbar p-1 rounded-xl mb-4"
                        >
                            {transcript ? (
                                <p className="text-lg leading-relaxed text-slate-200 whitespace-pre-wrap">
                                    {transcript}
                                    {isRecording && (
                                        <span className="inline-block w-2 h-6 bg-purple-500 ml-1 animate-pulse align-middle rounded-full" />
                                    )}
                                </p>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic gap-3 text-center px-4">
                                    {isRecording ? (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                                                <Mic className="w-6 h-6 text-purple-400 animate-pulse" />
                                            </div>
                                            <p className="text-slate-400 non-italic font-medium">Listening to your response...</p>
                                            <p className="text-xs text-slate-500">Your transcript will appear here as you speak</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                                <MessageSquare className="w-6 h-6 text-slate-700" />
                                            </div>
                                            <p>Your answer will appear here...</p>
                                            <p className="text-xs not-italic">Click the microphone button to start speaking</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
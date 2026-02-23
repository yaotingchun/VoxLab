"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    Mic,
    MicOff,
    Square,
    SkipForward,
    Volume2,
    VolumeX,
    Send,
    Loader2,
    User,
    Bot,
    Clock,
    MessageSquare,
    ChevronRight,
    AlertTriangle,
} from "lucide-react";
import type { InterviewQuestion, InterviewAnswer } from "@/types/interview";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { speakText, stopSpeaking } from "@/hooks/useInterview";

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
    onSubmitAnswer: (answer: string) => void;
    onSkip: () => void;
    onSpeakQuestion: (text?: string) => Promise<void>;
    onSpeakIntro: () => Promise<void>;
    onEnd: () => void;
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
    const {
        isListening,
        transcript,
        wpm,
        elapsedTime,
        startListening,
        stopListening,
        reset: resetSpeech,
        error: speechError,
    } = useSpeechRecognition();

    const [showIntro, setShowIntro] = useState(true);
    const [answerText, setAnswerText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [answerTimer, setAnswerTimer] = useState(0);
    const [hasSpoken, setHasSpoken] = useState(false);
    const [useTyping, setUseTyping] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);
    const prevQuestionIndex = useRef(-1);

    const currentQ = questions[currentQuestionIndex];
    const questionDisplay = isFollowUp ? currentFollowUp : currentQ?.question;
    const typeInfo = QUESTION_TYPE_LABELS[currentQ?.type || "icebreaker"];
    const progress = ((currentQuestionIndex + (isFollowUp ? 0.5 : 0)) / questions.length) * 100;

    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript, answerText]);

    // Handle intro
    useEffect(() => {
        if (showIntro && interviewerIntro) {
            onSpeakIntro().then(() => {
                setTimeout(() => {
                    setShowIntro(false);
                }, 1500);
            });
        }
    }, []);

    // When question changes, speak it
    useEffect(() => {
        if (showIntro) return;
        if (prevQuestionIndex.current === currentQuestionIndex && !isFollowUp) return;
        prevQuestionIndex.current = currentQuestionIndex;

        // Reset for new question
        setAnswerText("");
        setIsRecording(false);
        setAnswerTimer(0);
        setHasSpoken(false);
        resetSpeech();

        if (timerRef.current) clearInterval(timerRef.current);

        // Speak the question
        const text = isFollowUp ? currentFollowUp : currentQ?.question;
        if (text) {
            onSpeakQuestion(text);
        }
    }, [currentQuestionIndex, showIntro, isFollowUp, currentFollowUp]);

    // When follow-up arrives, speak it
    useEffect(() => {
        if (isFollowUp && currentFollowUp) {
            setAnswerText("");
            setIsRecording(false);
            setAnswerTimer(0);
            setHasSpoken(false);
            resetSpeech();
            if (timerRef.current) clearInterval(timerRef.current);
            onSpeakQuestion(currentFollowUp);
        }
    }, [isFollowUp, currentFollowUp]);

    // Sync speech recognition transcript to answerText
    useEffect(() => {
        if (isRecording && !useTyping) {
            setAnswerText(transcript);
        }
    }, [transcript, isRecording, useTyping]);

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
        setAnswerTimer(0);
        setUseTyping(false);
        startListening();
    }, [startListening]);

    const handleStopRecording = useCallback(() => {
        setIsRecording(false);
        stopListening();
    }, [stopListening]);

    const handleSubmit = useCallback(() => {
        if (!answerText.trim()) return;
        stopSpeaking();
        if (isRecording) {
            stopListening();
            setIsRecording(false);
        }
        onSubmitAnswer(answerText.trim());
        setAnswerText("");
        resetSpeech();
    }, [answerText, isRecording, stopListening, onSubmitAnswer, resetSpeech]);

    const handleSkip = useCallback(() => {
        stopSpeaking();
        if (isRecording) {
            stopListening();
            setIsRecording(false);
        }
        resetSpeech();
        setAnswerText("");
        onSkip();
    }, [isRecording, stopListening, resetSpeech, onSkip]);

    const handleSwitchToTyping = useCallback(() => {
        if (isRecording) {
            stopListening();
            setIsRecording(false);
        }
        setUseTyping(true);
    }, [isRecording, stopListening]);

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

                    {isSpeaking && (
                        <div className="flex items-center justify-center gap-2 text-blue-400">
                            <Volume2 className="w-4 h-4 animate-pulse" />
                            <span className="text-sm">Interviewer is speaking...</span>
                        </div>
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
                <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full border text-xs font-bold ${typeInfo.bg} ${typeInfo.color}`}>
                        {isFollowUp ? "Follow-up" : typeInfo.label}
                    </div>
                    <span className="text-sm text-slate-400">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-semibold tracking-wide">Mock Interview</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEnd}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <Square className="w-4 h-4 mr-1" />
                        End Interview
                    </Button>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 flex-shrink-0">
                <motion.div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full min-h-0">
                {/* Question Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${currentQuestionIndex}-${isFollowUp}`}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-900/80 rounded-2xl border border-slate-700/50 p-6 flex-shrink-0"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                                <Bot className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">
                                    Interviewer
                                </p>
                                <p className="text-lg text-white leading-relaxed">
                                    {questionDisplay}
                                </p>
                                {isSpeaking && (
                                    <div className="flex items-center gap-2 mt-3 text-blue-400">
                                        <Volume2 className="w-4 h-4 animate-pulse" />
                                        <span className="text-xs">Speaking...</span>
                                        <button
                                            onClick={() => stopSpeaking()}
                                            className="ml-2 text-slate-500 hover:text-white transition-colors"
                                        >
                                            <VolumeX className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Answer Area */}
                <div className="flex-1 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3">
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
                        className="flex-1 overflow-y-auto custom-scrollbar p-3 rounded-xl bg-slate-950/30 border border-slate-800/50 mb-4"
                    >
                        {useTyping ? (
                            <textarea
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                className="w-full h-full bg-transparent text-white resize-none focus:outline-none text-base leading-relaxed"
                                placeholder="Type your answer here..."
                                autoFocus
                            />
                        ) : answerText ? (
                            <p className="text-base leading-relaxed text-slate-200 whitespace-pre-wrap">
                                {answerText}
                                {isRecording && (
                                    <span className="inline-block w-2 h-5 bg-purple-500 ml-1 animate-pulse align-middle rounded-full" />
                                )}
                            </p>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 italic gap-3">
                                {isRecording ? (
                                    <>
                                        <Mic className="w-8 h-8 text-purple-400 animate-pulse" />
                                        <p>Listening... Speak your answer</p>
                                    </>
                                ) : (
                                    <>
                                        <p>Click the microphone to start recording your answer</p>
                                        <p className="text-xs">or switch to typing mode</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            {/* Mic Toggle */}
                            {!useTyping && (
                                <Button
                                    size="lg"
                                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                                    className={`rounded-full w-12 h-12 p-0 transition-all ${
                                        isRecording
                                            ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/30"
                                            : "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/30"
                                    }`}
                                >
                                    {isRecording ? (
                                        <MicOff className="w-5 h-5" />
                                    ) : (
                                        <Mic className="w-5 h-5" />
                                    )}
                                </Button>
                            )}

                            {/* Typing Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSwitchToTyping}
                                className={`text-xs ${useTyping ? "text-purple-400" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                {useTyping ? "Typing mode" : "Switch to typing"}
                            </Button>

                            {useTyping && !isRecording && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setUseTyping(false);
                                    }}
                                    className="text-xs text-slate-500 hover:text-slate-300"
                                >
                                    Use microphone
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSkip}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                <SkipForward className="w-4 h-4 mr-1" />
                                Skip
                            </Button>

                            <Button
                                size="default"
                                disabled={!answerText.trim()}
                                onClick={handleSubmit}
                                className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Submit Answer
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

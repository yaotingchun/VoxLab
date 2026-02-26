"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useInterview } from "@/hooks/useInterview";
import InterviewSetup from "@/components/interview/InterviewSetup";
import InterviewSession from "@/components/interview/InterviewSession";
import InterviewResults from "@/components/interview/InterviewResults";
import { Loader2, ArrowLeft, AlertTriangle, Home } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/ui/UserProfile";

export default function InterviewPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const {
        phase,
        resumeText,
        jobDescriptionText,
        notesText,
        questions,
        interviewerIntro,
        roleSummary,
        answers,
        currentQuestionIndex,
        evaluation,
        error,
        isFollowUp,
        currentFollowUp,
        isSpeaking,
        generatingFollowUp,
        setResumeText,
        setJobDescriptionText,
        setNotesText,
        startGenerating,
        speakCurrentQuestion,
        speakIntro,
        submitAnswer,
        skipQuestion,
        resetInterview,
        retryInterview,
    } = useInterview();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!user) return null;

    // ── Setup Phase ──────────────────────────────────────────────────────────
    if (phase === "setup") {
        return (
            <div className="relative min-h-screen bg-transparent text-white">

                {/* Header */}
                <header className="relative z-50 w-full bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50">
                    <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.back()}
                                className="text-white hover:text-white hover:bg-white/10 transition-all rounded-xl bg-white/5 border border-white/10"
                                title="Go Back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <Logo size="sm" className="opacity-80" />
                            <div className="h-4 w-[1px] bg-white/10" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Interview</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/dashboard/mode')}
                                className="text-slate-400 hover:text-primary transition-all flex items-center gap-2 text-sm font-medium"
                            >
                                Mode
                            </button>
                            <button
                                onClick={() => router.push('/forum')}
                                className="text-slate-400 hover:text-primary transition-all flex items-center gap-2 text-sm font-medium"
                            >
                                Forum
                            </button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/dashboard')}
                                className="text-white/50 hover:text-primary hover:bg-primary/10 transition-all rounded-xl"
                                title="Dashboard"
                            >
                                <Home className="w-5 h-5" />
                            </Button>
                            <NotificationDropdown />
                            {user && <UserProfile displayName={user.displayName || user.email?.split('@')[0] || "User"} />}
                        </div>
                    </div>
                </header>

                <InterviewSetup
                    resumeText={resumeText}
                    jobDescriptionText={jobDescriptionText}
                    notesText={notesText}
                    onResumeChange={setResumeText}
                    onJdChange={setJobDescriptionText}
                    onNotesChange={setNotesText}
                    onStart={startGenerating}
                    isGenerating={false}
                    error={error}
                />
            </div>
        );
    }

    // ── Generating Phase ─────────────────────────────────────────────────────
    if (phase === "generating") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-white gap-6 relative overflow-hidden">

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 text-center space-y-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-primary/20 rounded-full mx-auto" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-bold tracking-tight text-white animate-pulse">
                            Preparing Your Interview
                        </p>
                        <p className="text-sm text-slate-400">
                            Analyzing your resume and generating tailored questions...
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── Interview Phase ──────────────────────────────────────────────────────
    if (phase === "interview") {
        return (
            <div className="relative">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm flex items-center gap-2 backdrop-blur-xl"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </motion.div>
                )}
                <InterviewSession
                    questions={questions}
                    currentQuestionIndex={currentQuestionIndex}
                    interviewerIntro={interviewerIntro}
                    roleSummary={roleSummary}
                    isFollowUp={isFollowUp}
                    currentFollowUp={currentFollowUp}
                    isSpeaking={isSpeaking}
                    generatingFollowUp={generatingFollowUp}
                    answers={answers}
                    onSubmitAnswer={submitAnswer}
                    onSkip={skipQuestion}
                    onSpeakQuestion={speakCurrentQuestion}
                    onSpeakIntro={speakIntro}
                    onEnd={(visualMetrics, vocalMetrics) => {
                        if (answers.length > 0) {
                            // If some answers exist, evaluate what we have
                            submitAnswer("(Interview ended early)", visualMetrics, vocalMetrics);
                        } else {
                            resetInterview();
                        }
                    }}
                />
            </div>
        );
    }

    // ── Evaluating Phase ─────────────────────────────────────────────────────
    if (phase === "evaluating") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-white gap-6 relative overflow-hidden">

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed top-10 z-20 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm flex items-center gap-2 backdrop-blur-xl"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                    </motion.div>
                )}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 text-center space-y-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-bold tracking-tight text-white animate-pulse">
                            Analyzing Your Performance
                        </p>
                        <p className="text-sm text-slate-400">
                            AI is evaluating your answers, communication, and interview skills...
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── Results Phase ────────────────────────────────────────────────────────
    if (phase === "results" && evaluation) {
        return (
            <InterviewResults
                evaluation={evaluation}
                answers={answers}
                onRetry={retryInterview}
                onReset={resetInterview}
            />
        );
    }

    return null;
}
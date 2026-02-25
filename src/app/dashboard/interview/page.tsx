"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useInterview } from "@/hooks/useInterview";
import InterviewSetup from "@/components/interview/InterviewSetup";
import InterviewSession from "@/components/interview/InterviewSession";
import InterviewResults from "@/components/interview/InterviewResults";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

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
            <div className="relative">
                {/* Back Button */}
                <div className="fixed top-6 left-6 z-50">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Dashboard
                    </Link>
                </div>

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
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-blue-500/20 rounded-full mx-auto" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-lg font-semibold text-purple-300 animate-pulse">
                            Preparing Your Interview
                        </p>
                        <p className="text-sm text-slate-500">
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
                onEnd={() => {
                    if (answers.length > 0) {
                        // If some answers exist, evaluate what we have
                        submitAnswer("(Interview ended early)");
                    } else {
                        resetInterview();
                    }
                }}
            />
        );
    }

    // ── Evaluating Phase ─────────────────────────────────────────────────────
    if (phase === "evaluating") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-lg font-semibold text-blue-300 animate-pulse">
                            Analyzing Your Performance
                        </p>
                        <p className="text-sm text-slate-500">
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
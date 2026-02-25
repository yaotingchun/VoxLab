"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    RefreshCw,
    Trophy,
    MessageSquare,
    Brain,
    Users,
    Zap,
    ChevronDown,
    ChevronUp,
    Check,
    AlertTriangle,
    Lightbulb,
    Star,
    Target,
    TrendingUp,
    Sparkles,
    FileText,
} from "lucide-react";
import type { InterviewEvaluation, InterviewAnswer } from "@/types/interview";
import { DetailedSessionReport } from "@/components/analysis/DetailedSessionReport";

// ── Score Circle ─────────────────────────────────────────────────────────────
function ScoreCircle({
    score,
    size = 120,
    strokeWidth = 8,
    label,
}: {
    score: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 80) return "#22c55e";
        if (s >= 60) return "#f59e0b";
        if (s >= 40) return "#f97316";
        return "#ef4444";
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#1e293b"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={getColor(score)}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                        className="text-2xl font-bold text-white"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        {score}
                    </motion.span>
                </div>
            </div>
            {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
        </div>
    );
}

// ── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
    const getColor = (s: number) => {
        if (s >= 80) return "from-green-500 to-emerald-500";
        if (s >= 60) return "from-amber-500 to-yellow-500";
        if (s >= 40) return "from-orange-500 to-amber-500";
        return "from-red-500 to-orange-500";
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                    {icon}
                    {label}
                </div>
                <span className="text-sm font-semibold text-white">{score}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
                <motion.div
                    className={`h-2 rounded-full bg-gradient-to-r ${getColor(score)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}

// ── Question Evaluation Card ─────────────────────────────────────────────────
function QuestionCard({
    evaluation,
    answer,
    index,
}: {
    evaluation: {
        questionId: number;
        question: string;
        answer: string;
        score: number;
        strengths: string[];
        improvements: string[];
        idealAnswer: string;
        communicationScore: number;
        relevanceScore: number;
        depthScore: number;
    };
    answer?: InterviewAnswer;
    index: number;
}) {
    const [expanded, setExpanded] = useState(false);

    const getScoreColor = (s: number) => {
        if (s >= 80) return "text-green-400 border-green-500/30 bg-green-500/10";
        if (s >= 60) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
        if (s >= 40) return "text-orange-400 border-orange-500/30 bg-orange-500/10";
        return "text-red-400 border-red-500/30 bg-red-500/10";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden"
        >
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
            >
                <div className="flex items-center gap-3 text-left">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getScoreColor(evaluation.score)}`}>
                        <span className="text-sm font-bold">{evaluation.score}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            Q{index + 1}: {evaluation.question}
                        </p>
                        {answer && answer.answer !== "(Skipped)" ? (
                            <p className="text-xs text-slate-500 mt-0.5">
                                {answer.wordCount} words · {answer.duration}s · {answer.wpm} WPM
                                {answer.fillerWordCount > 0 && ` · ${answer.fillerWordCount} fillers`}
                            </p>
                        ) : (
                            <p className="text-xs text-slate-600 mt-0.5 italic">Skipped</p>
                        )}
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-800"
                    >
                        <div className="p-4 space-y-4">
                            {/* Your Answer */}
                            {answer && answer.answer !== "(Skipped)" && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Your Answer
                                    </p>
                                    <p className="text-sm text-slate-300 bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                                        {evaluation.answer || answer.answer}
                                    </p>
                                </div>
                            )}

                            {/* Sub-scores */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Relevance", score: evaluation.relevanceScore },
                                    { label: "Depth", score: evaluation.depthScore },
                                    { label: "Communication", score: evaluation.communicationScore },
                                ].map((s) => (
                                    <div key={s.label} className="text-center p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
                                        <p className="text-lg font-bold text-white">{s.score}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Strengths */}
                            {evaluation.strengths.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Check className="w-3 h-3" />
                                        Strengths
                                    </p>
                                    <ul className="space-y-1.5">
                                        {evaluation.strengths.map((s, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                <span className="text-green-500 mt-0.5">•</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Improvements */}
                            {evaluation.improvements.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <AlertTriangle className="w-3 h-3" />
                                        Areas to Improve
                                    </p>
                                    <ul className="space-y-1.5">
                                        {evaluation.improvements.map((s, i) => (
                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                <span className="text-amber-500 mt-0.5">•</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Ideal Answer */}
                            {evaluation.idealAnswer && (
                                <div>
                                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Lightbulb className="w-3 h-3" />
                                        Model Answer
                                    </p>
                                    <p className="text-sm text-slate-400 bg-blue-500/5 rounded-xl p-3 border border-blue-500/10 italic">
                                        {evaluation.idealAnswer}
                                    </p>
                                </div>
                            )}

                            {/* Follow-up */}
                            {answer?.followUpQuestion && (
                                <div className="border-t border-slate-800 pt-3">
                                    <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                                        Follow-up Question
                                    </p>
                                    <p className="text-sm text-slate-300 mb-2">&ldquo;{answer.followUpQuestion}&rdquo;</p>
                                    {answer.followUpAnswer && (
                                        <>
                                            <p className="text-xs text-slate-500 mb-1">Your response:</p>
                                            <p className="text-sm text-slate-400 bg-slate-950/50 rounded-lg p-2">
                                                {answer.followUpAnswer}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Main Results Component ───────────────────────────────────────────────────
interface InterviewResultsProps {
    evaluation: InterviewEvaluation;
    answers: InterviewAnswer[];
    onRetry: () => void;
    onReset: () => void;
}

export default function InterviewResults({
    evaluation,
    answers,
    onRetry,
    onReset,
}: InterviewResultsProps) {
    const [viewDetailed, setViewDetailed] = useState(false);

    if (viewDetailed) {
        // Map interview results to DetailedSessionReport structure
        const totalWords = answers.reduce((acc, a) => acc + a.wordCount, 0);
        const totalDuration = answers.reduce((acc, a) => acc + a.duration, 0);
        const avgWpm = totalDuration > 0 ? Math.round((totalWords / totalDuration) * 60) : 0;
        const totalFiller = answers.reduce((acc, a) => acc + a.fillerWordCount, 0);

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 overflow-y-auto">
                <div className="w-full max-w-4xl my-auto flex justify-center">
                    <DetailedSessionReport
                        data={{
                            summary: evaluation.overallFeedback,
                            tips: evaluation.topImprovements,
                            score: evaluation.overallScore,
                            interviewEvaluation: evaluation,
                            vocalSummary: evaluation.vocalSummary,
                            postureSummary: evaluation.postureSummary,
                            rawMetrics: {
                                // Fallback values from per-question reconstruction
                                duration: totalDuration,
                                wpm: avgWpm,
                                totalWords: totalWords,
                                fillerCounts: { "Overall": totalFiller },
                                pauseCount: 0,
                                wpmHistory: answers.map(a => a.wpm),
                                transcript: answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n'),
                                // Override with real cumulative session metrics (these take priority)
                                ...(evaluation.rawMetrics ?? {}),
                            }
                        }}
                        onClose={() => setViewDetailed(false)}
                    />
                </div>
            </div>
        );
    }

    const getRecommendationStyle = (rec: string) => {
        const lower = rec.toLowerCase();
        if (lower.includes("strong hire")) return "text-green-400 bg-green-500/10 border-green-500/20";
        if (lower.includes("hire")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        if (lower.includes("maybe")) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
        return "text-red-400 bg-red-500/10 border-red-500/20";
    };

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-3xl mx-auto space-y-8 pb-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <div className="flex justify-center">
                        <div className="p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-500/20">
                            <Trophy className="w-8 h-8 text-yellow-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Interview Complete</h1>
                    <p className="text-slate-400 max-w-md mx-auto text-sm">
                        Here&apos;s your detailed performance analysis
                    </p>
                </motion.div>

                {/* Overall Score & Feedback */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-slate-900 to-slate-900/80 rounded-3xl border border-slate-700/50 p-8"
                >
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <ScoreCircle score={evaluation.overallScore} size={140} strokeWidth={10} />
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <p className="text-slate-200 leading-relaxed">
                                {evaluation.overallFeedback}
                            </p>
                            <div
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${getRecommendationStyle(evaluation.hiringRecommendation)}`}
                            >
                                <Star className="w-4 h-4" />
                                {evaluation.hiringRecommendation}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Category Scores */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-4"
                >
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                        Performance Breakdown
                    </h2>
                    <ScoreBar
                        label="Communication"
                        score={evaluation.communicationScore}
                        icon={<MessageSquare className="w-4 h-4 text-blue-400" />}
                    />
                    <ScoreBar
                        label="Technical Knowledge"
                        score={evaluation.technicalScore}
                        icon={<Brain className="w-4 h-4 text-purple-400" />}
                    />
                    <ScoreBar
                        label="Behavioral / Soft Skills"
                        score={evaluation.behavioralScore}
                        icon={<Users className="w-4 h-4 text-amber-400" />}
                    />
                    <ScoreBar
                        label="Confidence & Delivery"
                        score={evaluation.confidenceScore}
                        icon={<Zap className="w-4 h-4 text-emerald-400" />}
                    />
                </motion.div>

                {/* Top Strengths & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-green-500/5 rounded-2xl border border-green-500/20 p-5"
                    >
                        <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Top Strengths
                        </h3>
                        <ul className="space-y-2">
                            {evaluation.topStrengths.map((s, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-5"
                    >
                        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Areas to Improve
                        </h3>
                        <ul className="space-y-2">
                            {evaluation.topImprovements.map((s, i) => (
                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Question-by-Question */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-3"
                >
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Question-by-Question Analysis
                    </h2>
                    {evaluation.questionEvaluations.map((qe, i) => (
                        <QuestionCard
                            key={qe.questionId}
                            evaluation={qe}
                            answer={answers[i]}
                            index={i}
                        />
                    ))}
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center justify-center gap-4 pt-4"
                >
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => setViewDetailed(true)}
                        className="rounded-xl bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        View Detailed Report
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={onRetry}
                        className="rounded-xl border-slate-700 hover:bg-slate-800"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Same Questions
                    </Button>
                    <Button
                        size="lg"
                        onClick={onReset}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        New Interview
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
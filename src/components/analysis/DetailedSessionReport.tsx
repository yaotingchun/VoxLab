"use client";

import { useRef, useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { Download, X, Activity, Mic, Clock, BarChart3, AlertCircle, TrendingUp, AlertTriangle, Video, Type, Share2, Sparkles, FileText, Target, Star, MessageSquare, Brain, Users, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { PacingChart } from "./PacingChart";
import { PitchChart } from "@/components/PitchChart";
import { PauseStats } from "@/lib/pause-analysis";
import { PrintableReportTemplate } from "./PrintableReportTemplate";
import { CircularScoreChart } from "./CircularScoreChart";
import { SessionChatbot } from "./SessionChatbot";
import { ShareSessionModal } from "./ShareSessionModal";
import ReactMarkdown from "react-markdown";
import { InterviewEvaluation, QuestionEvaluation } from "@/types/interview";


interface DetailedSessionReportProps {
    data: {
        summary: string;
        tips: string[];
        score?: number;
        topicAnalysis?: {
            relevanceScore: number;
            coveredPoints: string[];
            missedAngles: string[];
            contentSuggestions: string[];
        } | null;
        lectureAnalysis?: {
            teachingScore: number;
            clarityFeedback: string;
            potentialConfusion: string[];
            analogies: string[];
        } | null;
        vocalSummary?: { summary: string; tips: string[], score?: number } | null;
        postureSummary?: { summary: string; tips: string[], score?: number } | null;
        slideAnalysis?: {
            coveredPoints: string[];
            missedPoints: string[];
            alignmentScore: number;
            feedback: string;
        } | null;
        rubricAnalysis?: {
            rubricScore: number;
            strengths: string[];
            weaknesses: string[];
            feedback: string;
        } | null;
        qnaSummary?: QuestionEvaluation[] | null;
        interviewEvaluation?: InterviewEvaluation | null;
        videoUrl?: string; // Newly added video URL from GCS
        rawMetrics?: {
            topic?: string | null;
            duration: number;
            wpm: number;
            totalWords: number;
            fillerCounts: Record<string, number>;
            issueCounts?: Record<string, number>;
            pauseCount: number;
            wpmHistory: number[];
            words?: { word: string; startTime: number; endTime: number }[]; // Added

            // Explicitly match the structure from useSpeechRecognition & useAudioAnalysis
            pauseStats?: {
                stats: PauseStats;
                feedback: { message: string; type: "good" | "warn" | "bad" };
            } | null;

            audioMetrics?: {
                // Compatible with AudioStats from useAudioAnalysis
                averageVolume: number;
                pitchRange: number; // mapped to pitchStdDev
                isMonotone: boolean;
                isTooQuiet: boolean;
                pitchStdDev?: number;
                quietPercentage?: number;
            };

            // Raw samples for charts
            volumeSamples?: number[];
            pitchSamples?: number[];
            transcript?: string; // Added transcript
        };
    };
    onClose: () => void;
}

// Helper to get WPM zone color (copied from SpeechCoachPage)
const WPM_TARGET_LOW = 130;
const WPM_TARGET_HIGH = 155;
const WPM_WARNING_LOW = 110;
const WPM_WARNING_HIGH = 180;

function getWpmZoneColor(wpm: number): string {
    if (wpm < WPM_WARNING_LOW) return "#ef4444";
    if (wpm < WPM_TARGET_LOW) return "#f59e0b";
    if (wpm <= WPM_TARGET_HIGH) return "#22c55e";
    if (wpm <= WPM_WARNING_HIGH) return "#f59e0b";
    return "#ef4444";
}

export function DetailedSessionReport({ data, onClose }: DetailedSessionReportProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [currentReportIndex, setCurrentReportIndex] = useState<number>(0); // 0: General, 1: Vocal, 2: Posture, 3: Content, 4: Lecture

    // Content Analysis State
    const [contentAnalysis, setContentAnalysis] = useState<string>("");
    const [isAnalyzingContent, setIsAnalyzingContent] = useState(false);

    const reportRef = useRef<HTMLDivElement>(null);
    const printableRef = useRef<HTMLDivElement>(null); // New ref for printable version

    const downloadPDF = async () => {
        // Target the printable ref instead of the screen ref
        const element = document.getElementById("printable-root");
        if (!element) {
            console.error("Printable report element not found");
            return;
        }

        setIsDownloading(true);
        try {
            // Wait a moment for any final renders/animations to settle
            await new Promise(resolve => setTimeout(resolve, 500));

            // Find all printable pages from the DOM
            // The template now renders internal .printable-page divs
            const pageElements = element.querySelectorAll(".printable-page");

            // Standard A4 PDF props
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });
            const pdfWidth = 210;
            const pdfHeight = 297;

            // Capture each page independently and add to PDF
            for (let i = 0; i < pageElements.length; i++) {
                const pageEl = pageElements[i] as HTMLElement;

                // Add new PDF page for subsequent pages
                if (i > 0) {
                    pdf.addPage();
                }

                try {
                    // Capture logic for single A4 page
                    const imgData = await toPng(pageEl, {
                        cacheBust: true,
                        pixelRatio: 2,
                        backgroundColor: "#ffffff",
                        width: 794,
                        height: 1123,
                        style: {
                            visibility: 'visible',
                            opacity: '1',
                            transform: 'none',
                            display: 'flex' // Ensure flex layout works
                        }
                    });

                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                } catch (pageError) {
                    console.error(`Failed to capture page ${i + 1}:`, pageError);
                }
            }

            const now = new Date();
            const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
            const timeStr = now.toLocaleTimeString('en-GB', { hour12: false }).replace(/:/g, '-'); // HH-MM-SS
            pdf.save(`VoxLab_Report_${dateStr}_${timeStr}.pdf`);
        } catch (error) {
            console.error("PDF Generation Failed:", error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            alert(`Failed to generate PDF. Error: ${msg}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const metrics = data.rawMetrics || {
        duration: 0,
        wpm: 0,
        totalWords: 0,
        fillerCounts: {},
        issueCounts: {},
        pauseCount: 0,
        wpmHistory: [],
        pauseStats: undefined,
        audioMetrics: undefined,
        volumeSamples: [],
        pitchSamples: [],
        transcript: ""
    };

    const { messages: contentMessages, status: contentStatus, sendMessage: sendContentMessage } = useChat({
        api: "/api/chat",
        id: "content-coach"
    } as any);

    const isContentLoading = contentStatus === 'submitted' || contentStatus === 'streaming';
    const [hasTriggeredContent, setHasTriggeredContent] = useState(false);

    useEffect(() => {
        if (!hasTriggeredContent && metrics.transcript && sendContentMessage && !data.qnaSummary && !data.interviewEvaluation) {
            setHasTriggeredContent(true);
            setIsAnalyzingContent(true);

            const topicContext = metrics.topic
                ? `The speaker was practicing on the topic: "${metrics.topic}". Evaluate how well their speech addresses this topic, what key points they covered, and what important angles or arguments they missed.\n\n`
                : '';

            const slideContext = data.slideAnalysis
                ? `\n\n[SLIDES CONTEXT]: An initial analysis compared the speech to the speaker's uploaded slides. It found: "${data.slideAnalysis.feedback}". The speaker covered points like [${data.slideAnalysis.coveredPoints.join(", ")}] but MISSED points like [${data.slideAnalysis.missedPoints.join(", ")}]. Provide actionable advice on how to incorporate the missed visual points into their verbal delivery.`
                : '';

            const rubricContext = data.rubricAnalysis
                ? `\n\n[RUBRIC CONTEXT]: An initial analysis graded the speech against a rubric, scoring it ${data.rubricAnalysis.rubricScore}/100. Strengths: [${data.rubricAnalysis.strengths.join(", ")}]. Weaknesses: [${data.rubricAnalysis.weaknesses.join(", ")}]. Integrate this feedback into your coaching naturally.`
                : '';

            sendContentMessage({
                role: 'user',
                content: `${topicContext}Please analyze this speech script, giving me feedback and structural tips:\n\n${metrics.transcript}${slideContext}${rubricContext}`
            } as any).finally(() => {
                setIsAnalyzingContent(false);
            });
        }
    }, [metrics.transcript, sendContentMessage, hasTriggeredContent, metrics.topic, data.slideAnalysis, data.rubricAnalysis, data.qnaSummary]);

    // Derive the final content analysis text from the AI assistant message
    const streamedContentAnalysis = contentMessages
        .filter(m => m.role === 'assistant')
        .map(m => (m as any).content || (m as any).parts?.map((p: any) => p.text).join('') || '')
        .join('\n');

    const fillerTotal = Object.values(metrics.fillerCounts).reduce((a, b) => a + b, 0);

    // Prepare WPM Data Points for Chart
    const wpmDataPoints = metrics.wpmHistory.map((val, i) => ({
        time: (i + 1) * 5, // 5 second intervals
        wpm: val,
        wordCount: Math.round((val / 60) * 5) // approximate
    }));

    const pauseStats = metrics.pauseStats;
    const audioStats = metrics.audioMetrics ? {
        stats: {
            ...metrics.audioMetrics,
            pitchStdDev: metrics.audioMetrics.pitchStdDev ?? metrics.audioMetrics.pitchRange,
            quietPercentage: metrics.audioMetrics.quietPercentage ?? (metrics.audioMetrics.isTooQuiet ? 0.8 : 0.1)
        },
        feedback: {
            type: metrics.audioMetrics.isMonotone ? "warn" : "good",
            message: metrics.audioMetrics.isMonotone ? "Try varying your pitch more." : "Good tonal variety."
        }
    } : null;

    // Local Content Score Heuristic
    const contentLengthScore = Math.min((metrics.totalWords / 150) * 100, 100);
    const contentPacingScore = (metrics.wpm >= 130 && metrics.wpm <= 160) ? 100 : (metrics.wpm >= 110 && metrics.wpm <= 180) ? 80 : 50;
    const fillerPenalty = Math.min(fillerTotal * 5, 40);
    const localContentScore = Math.max(0, Math.round((contentLengthScore * 0.4) + (contentPacingScore * 0.6) - fillerPenalty));

    return (
        <>
            {/* Hidden Printable Template (Rendered off-screen) */}
            <div className="fixed top-0 left-[-9999px] w-[794px] min-h-[1123px] overflow-visible pointer-events-none z-[1000]">
                <PrintableReportTemplate
                    data={data}
                    metrics={metrics}
                    localContentScore={localContentScore}
                    contentAnalysis={streamedContentAnalysis}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 w-full max-w-4xl h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 shadow-2xl relative custom-scrollbar flex flex-col"
            >
                {/* Header / Controls */}
                <div className="sticky top-0 z-50 flex justify-between items-center p-6 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => setCurrentReportIndex(0)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${currentReportIndex === 0
                                ? "bg-slate-700 text-purple-400 shadow-lg"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                                }`}
                        >
                            <Sparkles className={`w-4 h-4 ${currentReportIndex === 0 ? "text-purple-400" : "text-slate-500"}`} />
                            <span className="text-sm font-bold">General</span>
                        </button>

                        <button
                            onClick={() => setCurrentReportIndex(1)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${currentReportIndex === 1
                                ? "bg-slate-700 text-pink-400 shadow-lg"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                                }`}
                        >
                            <Mic className={`w-4 h-4 ${currentReportIndex === 1 ? "text-pink-400" : "text-slate-500"}`} />
                            <span className="text-sm font-bold">Vocal</span>
                        </button>

                        <button
                            onClick={() => setCurrentReportIndex(2)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${currentReportIndex === 2
                                ? "bg-slate-700 text-blue-400 shadow-lg"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                                }`}
                        >
                            <Activity className={`w-4 h-4 ${currentReportIndex === 2 ? "text-blue-400" : "text-slate-500"}`} />
                            <span className="text-sm font-bold">Posture</span>
                        </button>

                        <button
                            onClick={() => setCurrentReportIndex(3)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${currentReportIndex === 3
                                ? "bg-slate-700 text-green-400 shadow-lg"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                                }`}
                        >
                            <BarChart3 className={`w-4 h-4 ${currentReportIndex === 3 ? "text-green-400" : "text-slate-500"}`} />
                            <span className="text-sm font-bold">Content</span>
                        </button>

                        {data.lectureAnalysis && (
                            <button
                                onClick={() => setCurrentReportIndex(4)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${currentReportIndex === 4
                                    ? "bg-slate-700 text-amber-400 shadow-lg"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                                    }`}
                            >
                                <Sparkles className={`w-4 h-4 ${currentReportIndex === 4 ? "text-amber-400" : "text-slate-500"}`} />
                                <span className="text-sm font-bold">Lecture</span>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            onClick={downloadPDF}
                            disabled={isDownloading || isContentLoading || isAnalyzingContent}
                        >
                            {isDownloading || isContentLoading || isAnalyzingContent ? (
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            {isDownloading ? "Generating..." : (isContentLoading || isAnalyzingContent) ? "AI Analyzing..." : "Download PDF"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500"
                            onClick={() => setIsSharing(true)}
                        >
                            <Share2 className="w-4 h-4" />
                            Share
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div ref={reportRef} className="p-8 space-y-8 bg-slate-900 min-h-full">

                    {currentReportIndex === 0 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* 1. Header */}
                            <div className="text-center space-y-2 pb-6 border-b border-slate-800">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    General Performance Report
                                </h1>
                                <p className="text-slate-400 text-sm">Generated by VoxLab AI</p>
                            </div >

                            {/* 2. Executive Summary & Score */}
                            < div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col md:flex-row gap-8 items-center" >
                                <div className="flex-1 space-y-4">
                                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Executive Summary
                                    </h3>
                                    <p className="text-slate-200 leading-relaxed text-lg">
                                        "{data.summary}"
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <CircularScoreChart
                                        score={data.score || Math.round(metrics.wpm > 0 ? 85 : 0)}
                                        label="Overall Score"
                                        color="text-blue-500"
                                    />
                                </div>
                            </div >

                            {/* 3. Key Metrics Grid */}
                            < div className="grid grid-cols-2 lg:grid-cols-4 gap-4" >
                                {/* WPM */}
                                < div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50" >
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <Clock className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Average Pace</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-1">{metrics.wpm} <span className="text-sm font-medium text-slate-500">WPM</span></div>
                                    <div className="text-xs text-slate-400">
                                        {metrics.wpm < 110 ? "Slow Paced" : metrics.wpm > 160 ? "Fast Paced" : "Optimal Pace"}
                                    </div>
                                </div >

                                {/* Total Words */}
                                <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <TrendingUp className="w-5 h-5 text-indigo-400" /> <span className="text-xs font-bold uppercase">Words</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-1">{metrics.totalWords}</div>
                                    <div className="text-sm text-slate-500">
                                        {Math.floor(metrics.duration / 60)}m {(metrics.duration % 60).toFixed(2)}s
                                    </div>
                                </div>
                                {/* Filler Words */}
                                < div className={`p-5 rounded-2xl border bg-slate-800/30 ${fillerTotal > 5 ? 'border-red-500/30' : 'border-green-500/30'}`
                                }>
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <AlertCircle className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Filler Words</span>
                                    </div>
                                    <div className={`text-3xl font-bold mb-1 ${fillerTotal > 5 ? 'text-red-400' : 'text-green-400'}`}>{fillerTotal}</div>
                                    <div className="text-xs text-slate-400">{fillerTotal > 5 ? "Needs Attention" : "Great Clarity"}</div>
                                </div >

                                {/* Pauses */}
                                < div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50" >
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <Mic className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Pauses</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-1">{metrics.pauseCount}</div>
                                    <div className="text-xs text-slate-400">Detected Gaps</div>
                                </div >
                            </div >

                            {/* Optional: Video Replay */}
                            {data.videoUrl && (
                                <div className="space-y-3 bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                        <Video className="w-4 h-4 text-indigo-400" /> Session Recording
                                    </h3>
                                    <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl bg-black aspect-video relative">
                                        <video
                                            src={data.videoUrl}
                                            controls
                                            className="w-full h-full object-contain"
                                            preload="metadata"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 4. Detailed Analysis Columns */}
                            < div className="grid md:grid-cols-2 gap-6" >

                                {/* Filler Word Breakdown */}
                                < div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50" >
                                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" /> Filler Word Breakdown
                                    </h3>
                                    {
                                        Object.keys(metrics.fillerCounts).length > 0 ? (
                                            <div className="space-y-3">
                                                {Object.entries(metrics.fillerCounts).map(([word, count]) => (
                                                    <div key={word} className="flex items-center justify-between group">
                                                        <span className="text-slate-300 capitalize">{word}</span>
                                                        <div className="flex items-center gap-3 flex-1 mx-4">
                                                            <div className="h-2 bg-slate-700 rounded-full flex-1 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-red-500/50 rounded-full"
                                                                    style={{ width: `${Math.min((count / Math.max(fillerTotal, 1)) * 100, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className="font-mono font-bold text-white">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-500 italic">
                                                No filler words detected. Excellent job! 👏
                                            </div>
                                        )
                                    }
                                </div >

                                {/* Actionable Tips */}
                                < div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 flex flex-col" >
                                    <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span>💡</span> Coach's Recommendations
                                    </h3>
                                    <ul className="space-y-4 flex-1">
                                        {data.tips.map((tip, index) => (
                                            <li key={index} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold text-xs border border-yellow-500/20">
                                                    {index + 1}
                                                </span>
                                                <p className="text-sm text-slate-200 leading-snug pt-0.5">{tip}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div >
                            </div >

                            {/* Pace Analysis & Interval Breakdown */}
                            < div className="grid grid-cols-1 gap-6" >
                                {/* Pace Analysis (New Graph Logic) */}
                                < div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50" >
                                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Pacing Over Time (Every 30 Seconds)
                                    </h3>

                                    {/* Logic to calculate buckets matches speech-coach/page.tsx exactly */}
                                    {
                                        (() => {
                                            const BUCKET_SIZE = 30; // 30 seconds
                                            const words = metrics.words || [];

                                            // Fallback if no words (e.g. from wpmHistory directly?)
                                            // Ideally we trust 'words' for accurate breakdown.
                                            if (words.length === 0 && metrics.wpmHistory.length > 0) {
                                                // Fallback to simple mapping if words are missing but history exists
                                                return (
                                                    <div className="text-center py-8 text-slate-500 italic">
                                                        Detailed interval data unavailable (using legacy mode).
                                                        <PacingChart dataPoints={wpmDataPoints} />
                                                    </div>
                                                );
                                            }

                                            const maxTime = Math.max(metrics.duration, ...words.map(w => w.endTime), 1);
                                            const totalBuckets = Math.ceil(maxTime / BUCKET_SIZE);

                                            const buckets = Array.from({ length: totalBuckets }, (_, i) => {
                                                const startTime = i * BUCKET_SIZE;
                                                const endTime = (i + 1) * BUCKET_SIZE;

                                                // Find words in this bucket
                                                const bucketWords = words.filter(w =>
                                                    (w.startTime >= startTime && w.startTime < endTime) ||
                                                    (w.endTime > startTime && w.endTime <= endTime)
                                                );

                                                const count = bucketWords.length;
                                                const wpm = Math.round((count / BUCKET_SIZE) * 60);

                                                // Color logic
                                                let color = "bg-green-500";
                                                let textColor = "text-green-500";
                                                if (wpm < 110 || wpm > 155) { color = "bg-red-500"; textColor = "text-red-500"; }
                                                else if (wpm < 130 || wpm > 155) { color = "bg-amber-500"; textColor = "text-amber-500"; }

                                                return {
                                                    intervalLabel: `${startTime}s – ${endTime}s`,
                                                    wpm,
                                                    wordCount: count,
                                                    color,
                                                    textColor,
                                                    time: endTime // for chart
                                                };
                                            });

                                            const chartData = buckets.map(b => ({
                                                time: b.time,
                                                wpm: b.wpm,
                                                wordCount: b.wordCount
                                            }));

                                            return (
                                                <div className="space-y-8">
                                                    {/* Chart */}
                                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                                        {chartData.length > 0 ? (
                                                            <PacingChart dataPoints={chartData} />
                                                        ) : (
                                                            <div className="text-center text-slate-500">Not enough data for chart</div>
                                                        )}
                                                    </div>

                                                    {/* Interval Breakdown Table */}
                                                    <div className="bg-slate-900/50 rounded-xl check-border border border-slate-800 overflow-hidden">
                                                        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                                                            <h4 className="text-sm font-bold text-slate-300 uppercase">Interval Breakdown</h4>
                                                            <div className="flex gap-4 text-xs font-mono text-slate-400">
                                                                <span>WPM</span>
                                                                <span>Words</span>
                                                            </div>
                                                        </div>
                                                        <div className="divide-y divide-slate-800/50">
                                                            {buckets.map((b, i) => (
                                                                <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/20 transition-colors">
                                                                    <div className="w-24 text-sm text-slate-400 font-mono shrink-0">{b.intervalLabel}</div>

                                                                    {/* Progress Bar */}
                                                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full ${b.color} rounded-full`}
                                                                            style={{ width: `${Math.min((b.wpm / 180) * 100, 100)}%` }}
                                                                        />
                                                                    </div>

                                                                    {/* Values */}
                                                                    <div className="flex gap-4 w-20 justify-end shrink-0 text-sm font-bold font-mono">
                                                                        <span className={b.textColor}>{b.wpm}</span>
                                                                        <span className="text-slate-500">{b.wordCount}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    }
                                </div >
                            </div >

                            {/* Vocal Dynamics & Pause Breakdown */}
                            < div className="space-y-6" >

                                {/* Audio Analysis Card (Matches SpeechCoachPage logic) */}
                                < div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50" >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-pink-400 uppercase tracking-widest flex items-center gap-2">
                                            <Mic className="w-4 h-4" /> Vocal Dynamics
                                        </h3>
                                        {audioStats && (
                                            <div className={`text-sm ${audioStats.stats.isMonotone ? "text-amber-400" : "text-green-400"}`}>
                                                {audioStats.stats.isMonotone ? "Monotone" : "Expressive"}
                                            </div>
                                        )}
                                    </div>

                                    {
                                        audioStats && metrics.pitchSamples && metrics.volumeSamples ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Pitch Range */}
                                                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                                                        <div className="text-2xl font-bold text-white">{audioStats.stats.pitchStdDev?.toFixed(1) || 0}</div>
                                                        <div className="text-xs text-slate-500">Pitch Variety (st)</div>
                                                        <div className="mt-1 flex gap-0.5 justify-center">
                                                            {[1, 2, 3, 4, 5].map(i => (
                                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${((audioStats.stats.pitchStdDev || 0) / 3) * 5 >= i ? "bg-purple-500" : "bg-white/10"}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* Volume Consistency */}
                                                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                                                        <div className="text-2xl font-bold text-white">
                                                            {Math.round((1 - (audioStats.stats.quietPercentage || 0)) * 100)}%
                                                        </div>
                                                        <div className="text-xs text-slate-500">Projection</div>
                                                        <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                            <div className={`h-full ${audioStats.stats.isTooQuiet ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${(1 - (audioStats.stats.quietPercentage || 0)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pitch Wave Graph */}
                                                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                                                    <div className="text-xs text-slate-500 mb-4">Pitch Contour (Intonation)</div>
                                                    <div className="h-32 w-full">
                                                        <PitchChart
                                                            pitchData={metrics.pitchSamples}
                                                            volumeData={metrics.volumeSamples}
                                                            color="#fbbf24"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-slate-500 italic text-sm">
                                                Audio analysis unavailable.
                                            </div>
                                        )
                                    }
                                </div >

                                {/* Pause Analysis Card (Matches SpeechCoachPage logic) */}
                                < div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50" >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Pause Analysis
                                        </h3>
                                        {pauseStats && (
                                            <div className={`text-sm ${pauseStats.stats.pauseRatio > 0.25 ? "text-amber-400" : "text-slate-400"}`}>
                                                {Math.round(pauseStats.stats.pauseRatio * 100)}% Silence
                                            </div>
                                        )}
                                    </div>

                                    {
                                        pauseStats ? (
                                            <div className="space-y-6">
                                                {/* Breakdown */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                                                        <div className="text-2xl font-bold text-white">{pauseStats.stats.emphasisCount}</div>
                                                        <div className="text-xs text-slate-500">Emphasis Pauses</div>
                                                        <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500" style={{ width: `${(pauseStats.stats.emphasisCount / Math.max(pauseStats.stats.totalPauses, 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                                                        <div className="text-2xl font-bold text-amber-400">{pauseStats.stats.thinkingCount}</div>
                                                        <div className="text-xs text-slate-500">Thinking Pauses</div>
                                                        <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-500" style={{ width: `${(pauseStats.stats.thinkingCount / Math.max(pauseStats.stats.totalPauses, 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Detailed Feedback */}
                                                <div className={`p-4 rounded-xl border text-sm ${pauseStats.feedback.type === "good" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                                    pauseStats.feedback.type === "warn" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                                        "bg-red-500/10 border-red-500/20 text-red-400"
                                                    }`}>
                                                    <div className="flex gap-2">
                                                        <span className="font-bold shrink-0">
                                                            {pauseStats.feedback.type === "good" ? "✅" : pauseStats.feedback.type === "warn" ? "⚠️" : "🚨"}
                                                        </span>
                                                        <p>{pauseStats.feedback.message}</p>
                                                    </div>
                                                </div>

                                                {/* Stats Row */}
                                                <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                                                    <span>Total Pauses: {pauseStats.stats.totalPauses}</span>
                                                    <span className={pauseStats.stats.breakdownCount > 0 ? "text-red-400" : ""}>
                                                        Breakdowns (&gt;2.5s): {pauseStats.stats.breakdownCount}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-slate-500 italic text-sm">
                                                Pause breakdown unavailable.
                                            </div>
                                        )
                                    }
                                </div >
                            </div >
                        </div>
                    )}

                    {currentReportIndex === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Header */}
                            <div className="text-center space-y-2 pb-6 border-b border-slate-800">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                                    Vocal Analysis
                                </h1>
                                <p className="text-slate-400 text-sm">Pacing, articulation, and energy</p>
                            </div>

                            {/* Vocal Coach Summary & Score */}
                            {data.vocalSummary && (
                                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col md:flex-row gap-8 items-center mb-8">
                                    <div className="flex-1 space-y-4">
                                        <h3 className="text-sm font-bold text-pink-400 uppercase tracking-widest flex items-center gap-2">
                                            <Mic className="w-4 h-4" /> Vocal Coach Summary
                                        </h3>
                                        <p className="text-slate-200 leading-relaxed text-lg">
                                            "{data.vocalSummary.summary}"
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <CircularScoreChart
                                            score={data.vocalSummary.score || Math.round(metrics.wpm > 0 ? 82 : 0)}
                                            label="Vocal Score"
                                            color="text-pink-500"
                                        />
                                    </div>
                                </div>
                            )}  {/* Focus specifically on Vocal tips */}
                            {data.vocalSummary?.tips && data.vocalSummary.tips.length > 0 && (
                                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                                    <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span>💡</span> Vocal Recommendations
                                    </h3>
                                    <ul className="space-y-4 flex-1">
                                        {data.vocalSummary.tips.map((tip, index) => (
                                            <li key={index} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold text-xs border border-yellow-500/20">
                                                    {index + 1}
                                                </span>
                                                <p className="text-sm text-slate-200 leading-snug pt-0.5">{tip}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* We moved Pace, PacingChart, Fillers, Pauses here as requested */}
                            {/* Pace Analysis Grid */}
                            < div className="grid grid-cols-2 lg:grid-cols-4 gap-4" >
                                {/* WPM */}
                                < div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50" >
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <Clock className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Average Pace</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-1">{metrics.wpm} <span className="text-sm font-medium text-slate-500">WPM</span></div>
                                    <div className="text-xs text-slate-400">
                                        {metrics.wpm < 110 ? "Slow Paced" : metrics.wpm > 160 ? "Fast Paced" : "Optimal Pace"}
                                    </div>
                                </div >
                                {/* Total Words */}
                                < div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50" >
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <TypeIcon className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Total Words</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-1">{metrics.totalWords}</div>
                                </div >
                                {/* Filler Words */}
                                < div className={`p-5 rounded-2xl border bg-slate-800/30 ${fillerTotal > 5 ? 'border-red-500/30' : 'border-green-500/30'}`
                                }>
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <AlertCircle className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Filler Words</span>
                                    </div>
                                    <div className={`text-3xl font-bold mb-1 ${fillerTotal > 5 ? 'text-red-400' : 'text-green-400'}`}>{fillerTotal}</div>
                                </div >
                                {/* Pauses */}
                                < div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50" >
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <Mic className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Pauses</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-1">{metrics.pauseCount}</div>
                                </div >
                            </div >

                            {/* Filler Word Breakdown & Pitch Analysis Columns */}
                            < div className="grid md:grid-cols-2 gap-6" >
                                {/* Filler Word Breakdown */}
                                < div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50" >
                                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" /> Filler Word Breakdown
                                    </h3>
                                    {
                                        Object.keys(metrics.fillerCounts).length > 0 ? (
                                            <div className="space-y-3">
                                                {Object.entries(metrics.fillerCounts).map(([word, count]) => (
                                                    <div key={word} className="flex items-center justify-between group">
                                                        <span className="text-slate-300 capitalize">{word}</span>
                                                        <div className="flex items-center gap-3 flex-1 mx-4">
                                                            <div className="h-2 bg-slate-700 rounded-full flex-1 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-red-500/50 rounded-full"
                                                                    style={{ width: `${Math.min((count / Math.max(fillerTotal, 1)) * 100, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className="font-mono font-bold text-white">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-500 italic">
                                                No filler words detected. Excellent job! 👏
                                            </div>
                                        )
                                    }
                                </div >

                                {/* Pause Analysis Breakdown */}
                                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Mic className="w-4 h-4" /> Pause Analysis
                                    </h3>
                                    {
                                        metrics.pauseStats ? (
                                            <div className="space-y-4">
                                                {/* Breakdown */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                                                        <div className="text-2xl font-bold text-white">{metrics.pauseStats.stats.emphasisCount}</div>
                                                        <div className="text-xs text-slate-500">Emphasis Pauses</div>
                                                        <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500" style={{ width: `${(metrics.pauseStats.stats.emphasisCount / Math.max(metrics.pauseStats.stats.totalPauses, 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
                                                        <div className="text-2xl font-bold text-amber-400">{metrics.pauseStats.stats.thinkingCount}</div>
                                                        <div className="text-xs text-slate-500">Thinking Pauses</div>
                                                        <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-500" style={{ width: `${(metrics.pauseStats.stats.thinkingCount / Math.max(metrics.pauseStats.stats.totalPauses, 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Detailed Feedback */}
                                                <div className={`p-4 rounded-xl border text-sm ${metrics.pauseStats.feedback.type === "good" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                                    metrics.pauseStats.feedback.type === "warn" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                                        "bg-red-500/10 border-red-500/20 text-red-400"
                                                    }`}>
                                                    <div className="flex gap-2">
                                                        <span className="font-bold shrink-0">
                                                            {metrics.pauseStats.feedback.type === "good" ? "✅" : metrics.pauseStats.feedback.type === "warn" ? "⚠️" : "🚨"}
                                                        </span>
                                                        <p>{metrics.pauseStats.feedback.message}</p>
                                                    </div>
                                                </div>

                                                {/* Stats Row */}
                                                <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                                                    <span>Total Pauses: {metrics.pauseStats.stats.totalPauses}</span>
                                                    <span className={metrics.pauseStats.stats.breakdownCount > 0 ? "text-red-400" : ""}>
                                                        Breakdowns (&gt;2.5s): {metrics.pauseStats.stats.breakdownCount}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-slate-500 italic text-sm">
                                                Pause breakdown unavailable.
                                            </div>
                                        )
                                    }
                                </div>
                            </ div >

                            {/* Vocal Dynamics - Full Row */}
                            {metrics.pitchSamples && metrics.volumeSamples && (
                                <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-sm flex flex-col gap-6">
                                    {/* Header */}
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-pink-500 uppercase tracking-widest flex items-center gap-2">
                                            <Mic className="w-5 h-5" /> VOCAL DYNAMICS
                                        </h3>
                                        <span className={`text-base font-semibold ${!audioStats?.stats.isMonotone ? 'text-emerald-400' : 'text-slate-400'}`}>
                                            {!audioStats?.stats.isMonotone ? 'Expressive' : 'Monotone'}
                                        </span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Pitch Variety */}
                                        <div className="p-5 rounded-xl bg-[#131b2e] border border-slate-800/80 flex flex-col items-center justify-center gap-1.5 min-h-[100px]">
                                            <div className="text-3xl font-bold text-white leading-none">
                                                {audioStats?.stats.pitchStdDev?.toFixed(1) || "0.0"}
                                            </div>
                                            <div className="text-[13px] text-slate-500 mb-1">Pitch Variety (st)</div>
                                            {/* Dots indicator */}
                                            <div className="flex gap-1">
                                                {[...Array(5)].map((_, i) => {
                                                    const stdDev = audioStats?.stats.pitchStdDev || 0;
                                                    const active = i < Math.min(5, Math.ceil(stdDev / 2));
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-purple-500' : 'bg-slate-700/50'}`}
                                                        />
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Projection */}
                                        <div className="p-5 rounded-xl bg-[#131b2e] border border-slate-800/80 flex flex-col items-center justify-center gap-1.5 min-h-[100px]">
                                            <div className="text-3xl font-bold text-white leading-none">
                                                {Math.round((1 - (audioStats?.stats.quietPercentage || 0)) * 100)}%
                                            </div>
                                            <div className="text-[13px] text-slate-500 mb-1">Projection</div>
                                            {/* Progress bar */}
                                            <div className="w-full max-w-[140px] h-1 bg-slate-800 rounded-full overflow-hidden mt-1 flex">
                                                <div
                                                    className="h-full bg-red-500 rounded-full"
                                                    style={{ width: `${Math.round((1 - (audioStats?.stats.quietPercentage || 0)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pitch Contour (Intonation) */}
                                    <div className="p-5 rounded-xl bg-[#131b2e] border border-slate-800/80">
                                        <h4 className="text-[13px] text-slate-400 mb-6">Pitch Contour (Intonation)</h4>
                                        <div className="h-40 w-full relative pt-2">
                                            <PitchChart
                                                pitchData={metrics.pitchSamples}
                                                volumeData={metrics.volumeSamples}
                                                color="#fbbf24"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PacingChart & Interval Breakdown Logic copied here */}
                            < div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50" >
                                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Pacing Over Time
                                </h3>
                                {/* Interval logic */}
                                {(() => {
                                    const BUCKET_SIZE = 30; // 30 seconds
                                    const words = metrics.words || [];
                                    if (words.length === 0 && metrics.wpmHistory.length > 0) {
                                        return (
                                            <div className="space-y-4">
                                                <PacingChart dataPoints={wpmDataPoints} />
                                            </div>
                                        );
                                    }
                                    const maxTime = Math.max(metrics.duration, ...words.map(w => w.endTime), 1);
                                    const totalBuckets = Math.ceil(maxTime / BUCKET_SIZE);
                                    const buckets = Array.from({ length: totalBuckets }, (_, i) => {
                                        const startTime = i * BUCKET_SIZE;
                                        const endTime = (i + 1) * BUCKET_SIZE;
                                        const bucketWords = words.filter(w =>
                                            (w.startTime >= startTime && w.startTime < endTime) ||
                                            (w.endTime > startTime && w.endTime <= endTime)
                                        );
                                        const count = bucketWords.length;
                                        const wpm = Math.round((count / BUCKET_SIZE) * 60);
                                        let color = "bg-green-500";
                                        let textColor = "text-green-500";
                                        if (wpm < 110 || wpm > 155) { color = "bg-red-500"; textColor = "text-red-500"; }
                                        else if (wpm < 130 || wpm > 155) { color = "bg-amber-500"; textColor = "text-amber-500"; }
                                        return { intervalLabel: `${startTime}s – ${endTime}s`, wpm, wordCount: count, color, textColor, time: endTime };
                                    });
                                    return (
                                        <div className="space-y-8">
                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                                <PacingChart dataPoints={buckets.map(b => ({ time: b.time, wpm: b.wpm, wordCount: b.wordCount }))} />
                                            </div>
                                            <div className="bg-slate-900/50 rounded-xl check-border border border-slate-800 overflow-hidden">
                                                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                                                    <h4 className="text-sm font-bold text-slate-300 uppercase">Interval Breakdown</h4>
                                                    <div className="flex gap-4 text-xs font-mono text-slate-400">
                                                        <span>WPM</span>
                                                        <span>Words</span>
                                                    </div>
                                                </div>
                                                <div className="divide-y divide-slate-800/50">
                                                    {buckets.map((b, i) => (
                                                        <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/20 transition-colors">
                                                            <div className="w-24 text-sm text-slate-400 font-mono shrink-0">{b.intervalLabel}</div>
                                                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                                <div className={`h-full ${b.color} rounded-full`} style={{ width: `${Math.min((b.wpm / 180) * 100, 100)}%` }} />
                                                            </div>
                                                            <div className="flex gap-4 w-20 justify-end shrink-0 text-sm font-bold font-mono">
                                                                <span className={b.textColor}>{b.wpm}</span>
                                                                <span className="text-slate-500">{b.wordCount}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div >
                        </div>
                    )}

                    {currentReportIndex === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Header */}
                            <div className="text-center space-y-2 pb-6 border-b border-slate-800">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                    Posture & Presence
                                </h1>
                                <p className="text-slate-400 text-sm">Body language, alignment, and eye contact</p>
                            </div>

                            {/* Posture Coach Summary & Score */}
                            {data.postureSummary && (
                                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col md:flex-row gap-8 items-center mb-8">
                                    <div className="flex-1 space-y-4">
                                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="w-4 h-4" /> Body Language Coach
                                        </h3>
                                        <p className="text-slate-200 leading-relaxed text-lg">
                                            "{data.postureSummary.summary}"
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <CircularScoreChart
                                            score={data.postureSummary.score || Math.round(metrics.wpm > 0 ? 88 : 0)}
                                            label="Posture Score"
                                            color="text-cyan-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Focus specifically on Posture tips */}
                            {data.postureSummary?.tips && data.postureSummary.tips.length > 0 && (
                                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 flex flex-col">
                                    <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span>💡</span> Posture Recommendations
                                    </h3>
                                    <ul className="space-y-4 flex-1">
                                        {data.postureSummary.tips.map((tip, index) => (
                                            <li key={index} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold text-xs border border-yellow-500/20">
                                                    {index + 1}
                                                </span>
                                                <p className="text-sm text-slate-200 leading-snug pt-0.5">{tip}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Issue Counts Breakdown */}
                            <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Detected Posture Issues
                                </h3>
                                {
                                    metrics.issueCounts && Object.keys(metrics.issueCounts).length > 0 ? (
                                        <div className="space-y-3">
                                            {Object.entries(metrics.issueCounts).map(([issue, count]) => (
                                                <div key={issue} className="flex items-center justify-between group">
                                                    <span className="text-slate-300 capitalize">{issue.replace(/_/g, ' ').toLowerCase()}</span>
                                                    <div className="flex items-center gap-3 flex-1 mx-4">
                                                        <div className="h-2 bg-slate-700 rounded-full flex-1 overflow-hidden">
                                                            <div
                                                                className="h-full bg-red-500/50 rounded-full"
                                                                style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className="font-mono font-bold text-white">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-500 italic">
                                            No significant posture issues detected. Great form! 🌟
                                        </div>
                                    )
                                }
                            </div>

                        </div>
                    )}

                    {currentReportIndex === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* 1. Header */}
                            <div className="text-center space-y-2 pb-6 border-b border-slate-800">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                                    Content Analysis
                                </h1>
                                <p className="text-slate-400 text-sm">Review and analyze your speech script</p>
                                {metrics.topic && (
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mt-2">
                                        <span className="text-emerald-400 text-xs font-medium">Topic:</span>
                                        <span className="text-white text-sm font-semibold">{metrics.topic}</span>
                                    </div>
                                )}
                            </div>

                            {/* Topic Relevance Analysis — Only shown when a topic was selected */}
                            {data.topicAnalysis && (
                                <div className="space-y-6">
                                    {/* Relevance Score + Summary */}
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-emerald-500/20 flex flex-col md:flex-row gap-8 items-center">
                                        <div className="flex-1 space-y-3">
                                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                                🎯 Topic Relevance
                                            </h3>
                                            <p className="text-slate-300 text-sm leading-relaxed">
                                                {data.topicAnalysis.relevanceScore >= 80
                                                    ? "Your speech strongly addressed the topic with relevant points and arguments."
                                                    : data.topicAnalysis.relevanceScore >= 50
                                                        ? "Your speech partially covered the topic but missed some important angles."
                                                        : "Your speech needs more focus on the assigned topic. Consider restructuring around key arguments."}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <CircularScoreChart
                                                score={data.topicAnalysis.relevanceScore}
                                                label="Relevance"
                                                color="text-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Covered Points & Missed Angles */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Covered Points */}
                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                            <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                ✅ Points Covered
                                            </h3>
                                            {data.topicAnalysis.coveredPoints.length > 0 ? (
                                                <ul className="space-y-3">
                                                    {data.topicAnalysis.coveredPoints.map((point, i) => (
                                                        <li key={i} className="flex items-start gap-3 p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">✓</span>
                                                            <p className="text-sm text-slate-200 leading-snug">{point}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-slate-500 italic text-sm">No specific topic points were identified in your speech.</p>
                                            )}
                                        </div>

                                        {/* Missed Angles */}
                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                ⚠️ Missed Angles
                                            </h3>
                                            {data.topicAnalysis.missedAngles.length > 0 ? (
                                                <ul className="space-y-3">
                                                    {data.topicAnalysis.missedAngles.map((angle, i) => (
                                                        <li key={i} className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">!</span>
                                                            <p className="text-sm text-slate-200 leading-snug">{angle}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-slate-500 italic text-sm">Great coverage — no major angles were missed!</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Suggestions */}
                                    {data.topicAnalysis.contentSuggestions.length > 0 && (
                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                💡 Suggested Additions
                                            </h3>
                                            <ul className="space-y-3">
                                                {data.topicAnalysis.contentSuggestions.map((suggestion, i) => (
                                                    <li key={i} className="flex items-start gap-3 p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold text-xs border border-cyan-500/20">
                                                            {i + 1}
                                                        </span>
                                                        <p className="text-sm text-slate-200 leading-snug">{suggestion}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Slide Alignment Analysis */}
                            {data.slideAnalysis && (
                                <div className="space-y-6">
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-blue-500/20 flex flex-col md:flex-row gap-8 items-center">
                                        <div className="flex-1 space-y-3">
                                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                                <FileText className="w-4 h-4" /> Slide Alignment
                                            </h3>
                                            <p className="text-slate-300 text-sm leading-relaxed">
                                                {data.slideAnalysis.feedback}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <CircularScoreChart
                                                score={data.slideAnalysis.alignmentScore}
                                                label="Alignment"
                                                color="text-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                            <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                ✅ Points Covered
                                            </h3>
                                            <ul className="space-y-3">
                                                {data.slideAnalysis.coveredPoints.map((point, i) => (
                                                    <li key={i} className="flex items-start gap-3 p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">✓</span>
                                                        <p className="text-sm text-slate-200 leading-snug">{point}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                ⚠️ Missed Points
                                            </h3>
                                            <ul className="space-y-3">
                                                {data.slideAnalysis.missedPoints.length > 0 ? data.slideAnalysis.missedPoints.map((point, i) => (
                                                    <li key={i} className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold">!</span>
                                                        <p className="text-sm text-slate-200 leading-snug">{point}</p>
                                                    </li>
                                                )) : <p className="text-slate-500 italic text-sm">All key points were covered!</p>}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rubric Analysis */}
                            {data.rubricAnalysis && (
                                <div className="space-y-6">
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-purple-500/20 flex flex-col md:flex-row gap-8 items-center">
                                        <div className="flex-1 space-y-3">
                                            <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" /> Rubric Evaluation
                                            </h3>
                                            <p className="text-slate-300 text-sm leading-relaxed">
                                                {data.rubricAnalysis.feedback}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <CircularScoreChart
                                                score={data.rubricAnalysis.rubricScore}
                                                label="Rubric Score"
                                                color="text-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                🌟 Key Strengths
                                            </h3>
                                            <ul className="space-y-3">
                                                {data.rubricAnalysis.strengths.map((str, i) => (
                                                    <li key={i} className="flex items-start gap-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold">✓</span>
                                                        <p className="text-sm text-slate-200 leading-snug">{str}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                📉 Areas to Improve
                                            </h3>
                                            <ul className="space-y-3">
                                                {data.rubricAnalysis.weaknesses.map((weakness, i) => (
                                                    <li key={i} className="flex items-start gap-3 p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-xs font-bold">↓</span>
                                                        <p className="text-sm text-slate-200 leading-snug">{weakness}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-6">

                                {!data.qnaSummary && !data.interviewEvaluation && (
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col md:flex-row gap-8 items-center">
                                        <div className="flex-1 space-y-4">
                                            <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                                                <Activity className="w-4 h-4" /> Content Heuristic Score
                                            </h3>
                                            <p className="text-slate-200 leading-relaxed text-sm">
                                                This score is calculated locally based on your transcript length, pacing, and filler word frequency. The AI Coach below will stream specific structural advice.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <CircularScoreChart
                                                score={localContentScore}
                                                label="Content Score"
                                                color="text-green-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {!data.interviewEvaluation && (
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col">
                                        <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Mic className="w-4 h-4" /> Live Transcript
                                        </h3>
                                        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 overflow-y-auto max-h-[500px] text-slate-300 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                                            {metrics.transcript || "No transcript recorded for this session."}
                                        </div>
                                    </div>
                                )}

                                {/* Interview Section */}
                                {data.interviewEvaluation && (
                                    <div className="space-y-8">
                                        {/* Hiring Recommendation & Overall Score */}
                                        <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
                                            <div className="flex flex-col md:flex-row items-center gap-10">
                                                <div className="flex-shrink-0">
                                                    <CircularScoreChart
                                                        score={data.interviewEvaluation.overallScore}
                                                        label="Executive Score"
                                                        color="text-indigo-500"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-6">
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Hiring Recommendation</h3>
                                                        <div className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full border text-lg font-bold ${data.interviewEvaluation.hiringRecommendation.toLowerCase().includes('strong hire') ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                                                            data.interviewEvaluation.hiringRecommendation.toLowerCase().includes('hire') ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                                                data.interviewEvaluation.hiringRecommendation.toLowerCase().includes('maybe') ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                                                                    'text-red-400 bg-red-500/10 border-red-500/20'
                                                            }`}>
                                                            <Star className="w-5 h-5" />
                                                            {data.interviewEvaluation.hiringRecommendation}
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-200 text-lg leading-relaxed italic">
                                                        "{data.interviewEvaluation.overallFeedback}"
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                                                {[
                                                    { label: "Communication", score: data.interviewEvaluation.communicationScore, color: "bg-blue-500", icon: MessageSquare },
                                                    { label: "Technical", score: data.interviewEvaluation.technicalScore, color: "bg-purple-500", icon: Brain },
                                                    { label: "Behavioral", score: data.interviewEvaluation.behavioralScore, color: "bg-amber-500", icon: Users },
                                                    { label: "Confidence", score: data.interviewEvaluation.confidenceScore, color: "bg-emerald-500", icon: Zap },
                                                ].map((stat) => (
                                                    <div key={stat.label} className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
                                                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                                                            <stat.icon className="w-3.5 h-3.5" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                                                        </div>
                                                        <div className="text-2xl font-bold text-white mb-2">{stat.score}</div>
                                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${stat.score}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Top Strengths & Improvements */}
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="bg-emerald-500/5 rounded-2xl border border-emerald-500/20 p-6">
                                                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Target className="w-4 h-4" /> Top Strengths
                                                </h3>
                                                <ul className="space-y-3">
                                                    {data.interviewEvaluation.topStrengths.map((s, i) => (
                                                        <li key={i} className="text-sm text-slate-300 flex items-start gap-3">
                                                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                            <span>{s}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-6">
                                                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4" /> Areas for Improvement
                                                </h3>
                                                <ul className="space-y-3">
                                                    {data.interviewEvaluation.topImprovements.map((s, i) => (
                                                        <li key={i} className="text-sm text-slate-300 flex items-start gap-3">
                                                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                            <span>{s}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Question Breakdown */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Question Breakdown</h3>
                                            {data.interviewEvaluation.questionEvaluations.map((qe, idx) => (
                                                <div key={idx} className="bg-slate-800/20 rounded-2xl border border-slate-800 overflow-hidden">
                                                    <div className="p-6 space-y-6">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="space-y-2 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase tracking-tighter">Q{idx + 1}</span>
                                                                    <span className="text-sm font-bold text-slate-200">Interview Question</span>
                                                                </div>
                                                                <p className="text-lg text-white font-medium leading-relaxed">{qe.question}</p>
                                                            </div>
                                                            <div className="text-center bg-slate-800/80 rounded-2xl px-5 py-3 border border-slate-700">
                                                                <div className="text-2xl font-bold text-indigo-400 leading-none mb-1">{qe.score}</div>
                                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Score</div>
                                                            </div>
                                                        </div>

                                                        <div className="grid md:grid-cols-2 gap-6">
                                                            <div className="space-y-4">
                                                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                                                                    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                                                                        <Mic className="w-3 h-3 text-emerald-400" /> Your Response
                                                                    </div>
                                                                    <p className="text-sm text-slate-300 leading-relaxed italic">&ldquo;{qe.answer}&rdquo;</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    {[
                                                                        { label: "Relevance", score: qe.relevanceScore },
                                                                        { label: "Depth", score: qe.depthScore },
                                                                        { label: "Comm.", score: qe.communicationScore },
                                                                    ].map(s => (
                                                                        <div key={s.label} className="flex-1 text-center py-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                                                            <div className="text-sm font-bold text-slate-200">{s.score}</div>
                                                                            <div className="text-[10px] text-slate-500 uppercase tracking-tighter font-semibold">{s.label}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10">
                                                                    <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                                                                        <Sparkles className="w-3 h-3" /> Ideal Answer Concept
                                                                    </div>
                                                                    <p className="text-sm text-indigo-100/70 leading-relaxed">{qe.idealAnswer}</p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                                                            <Check className="w-2.5 h-2.5" /> Strengths
                                                                        </span>
                                                                        <ul className="space-y-1">
                                                                            {qe.strengths.slice(0, 2).map((s, i) => (
                                                                                <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1">
                                                                                    <span className="text-emerald-500/50 mt-1 flex-shrink-0">•</span>
                                                                                    <span>{s}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                                                            <AlertTriangle className="w-2.5 h-2.5" /> Improves
                                                                        </span>
                                                                        <ul className="space-y-1">
                                                                            {qe.improvements.slice(0, 2).map((s, i) => (
                                                                                <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1">
                                                                                    <span className="text-amber-500/50 mt-1 flex-shrink-0">•</span>
                                                                                    <span>{s}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Q&A Breakdown */}
                                {data.qnaSummary && !data.interviewEvaluation && (
                                    <div className="space-y-6">
                                        {/* Average Relevance Score */}
                                        <div className="bg-slate-800/50 rounded-2xl p-6 border border-teal-500/20 flex flex-col md:flex-row gap-8 items-center">
                                            <div className="flex-1 space-y-3">
                                                <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Target className="w-4 h-4" /> Average Relevance
                                                </h3>
                                                <p className="text-slate-300 text-sm leading-relaxed">
                                                    This score represents how well your answers addressed the specific questions asked during the Q&A session.
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <CircularScoreChart
                                                    score={Math.round(data.qnaSummary.reduce((acc, curr) => acc + curr.relevanceScore, 0) / Math.max(1, data.qnaSummary.length))}
                                                    label="Avg Score"
                                                    color="text-teal-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Questions Breakdown */}
                                        <div className="space-y-6">
                                            {data.qnaSummary.map((qna, idx) => (
                                                <div key={idx} className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50 space-y-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="space-y-1">
                                                            <h3 className="text-sm font-bold text-slate-200">Question {idx + 1}</h3>
                                                            <p className="text-slate-300 font-medium">{qna.question}</p>
                                                        </div>
                                                        <div className="flex bg-slate-800 rounded-full px-3 py-1 items-center gap-2 border border-slate-700">
                                                            <span className="text-xs font-bold text-slate-400">Score</span>
                                                            <span className={`text-sm font-bold ${qna.relevanceScore >= 80 ? 'text-emerald-400' : qna.relevanceScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                                {qna.relevanceScore}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                                                        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                                                                <Mic className="w-3 h-3 text-emerald-400" /> Your Answer
                                                            </div>
                                                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{qna.answer}</p>
                                                        </div>
                                                        <div className="bg-teal-900/10 rounded-xl p-4 border border-teal-500/20">
                                                            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">
                                                                <Sparkles className="w-3 h-3 text-teal-400" /> Ideal Answer Concept
                                                            </div>
                                                            <p className="text-teal-100/80 text-sm leading-relaxed whitespace-pre-wrap">{qna.idealAnswer}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Analysis Column */}
                                {!data.qnaSummary && !data.interviewEvaluation && (
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
                                                <Activity className="w-4 h-4" /> AI Content Coach
                                            </h3>
                                            {!contentAnalysis && isAnalyzingContent && (
                                                <div className="flex items-center gap-2 text-teal-400 text-sm">
                                                    <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                                                    Analyzing...
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 overflow-y-auto max-h-[500px] flex-1 text-slate-300 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                                            {isContentLoading && !streamedContentAnalysis && (
                                                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                                                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                                    <p>Analyzing script flow and impact...</p>
                                                </div>
                                            )}
                                            {streamedContentAnalysis && (
                                                <div className="prose prose-invert prose-p:leading-snug prose-sm max-w-none">
                                                    <ReactMarkdown>{streamedContentAnalysis}</ReactMarkdown>
                                                    {isContentLoading && <span className="inline-block w-2 h-4 bg-teal-500 ml-1 animate-pulse" />}
                                                </div>
                                            )}
                                            {!isContentLoading && !streamedContentAnalysis && (
                                                <div className="flex flex-col items-center justify-center h-full text-slate-500 italic text-center text-sm px-4">
                                                    {metrics.transcript ? "Preparing analysis..." : "Speak during the session to record a transcript for analysis."}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentReportIndex === 4 && data.lectureAnalysis && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* 1. Header */}
                            <div className="text-center space-y-2 pb-6 border-b border-slate-800">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                                    Lecture Mode Analysis
                                </h1>
                                <p className="text-slate-400 text-sm">Specialized feedback for teaching and instruction</p>
                            </div>

                            {/* Teaching Score & Overall Clarity */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-amber-500/20 flex flex-col md:flex-row gap-8 items-center">
                                <div className="flex-1 space-y-4">
                                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> Instructional Clarity
                                    </h3>
                                    <p className="text-slate-200 leading-relaxed text-lg italic">
                                        "{data.lectureAnalysis.clarityFeedback}"
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <CircularScoreChart
                                        score={data.lectureAnalysis.teachingScore}
                                        label="Clarity Score"
                                        color="text-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Potential Confusions */}
                                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                    <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        ⚠️ Student Blindspots
                                    </h3>
                                    <p className="text-xs text-slate-400 mb-4">Areas that might be confusing for someone new to the material.</p>
                                    <ul className="space-y-3">
                                        {data.lectureAnalysis.potentialConfusion.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold">!</span>
                                                <p className="text-sm text-slate-200">{item}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Analogy Suggestions */}
                                <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        💡 Power Analogies
                                    </h3>
                                    <p className="text-xs text-slate-400 mb-4">AI-suggested comparisons to make complex parts stick.</p>
                                    <ul className="space-y-3">
                                        {data.lectureAnalysis.analogies.map((analogy, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">?</span>
                                                <p className="text-sm text-slate-200 italic">{analogy}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div >

                {/* Session Context Chatbot */}
                <SessionChatbot reportData={{ ...data, contentAnalysis: streamedContentAnalysis }} />

                {/* Share to Forum Modal */}
                <ShareSessionModal
                    isOpen={isSharing}
                    onClose={() => setIsSharing(false)}
                    sessionData={{
                        ...data,
                        summary: data.summary,
                        tips: data.tips,
                        score: data.score,
                        vocalSummary: data.vocalSummary,
                        postureSummary: data.postureSummary,
                        videoUrl: data.videoUrl,
                        rawMetrics: {
                            duration: metrics.duration,
                            wpm: metrics.wpm,
                            transcript: metrics.transcript
                        }
                    }}
                />

            </motion.div>
        </>
    );
}

function TypeIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" x2="15" y1="20" y2="20" />
            <line x1="12" x2="12" y1="4" y2="20" />
        </svg>
    )
}

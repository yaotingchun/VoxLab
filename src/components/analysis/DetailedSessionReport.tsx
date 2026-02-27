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
import { InterviewEvaluation, QuestionEvaluation, InterviewAnswer } from "@/types/interview";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";


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
    hideGlobalHeader?: boolean;
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

export function DetailedSessionReport({ data, onClose, hideGlobalHeader = false }: DetailedSessionReportProps) {
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
                        backgroundColor: "#0B0A11",
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

    // Question Markers for Interview Mode
    const answers = (metrics as any).answers as InterviewAnswer[] | undefined;
    const answerSegments = (metrics as any).answerSegments;

    // Prepare WPM Data Points for Chart
    // If in interview mode with per-question data, use the question averages to avoid "spikes" during transitions
    const wpmDataPoints = (answers && answers.length > 0)
        ? (() => {
            let elapsed = 0;
            const points: { time: number; wpm: number; wordCount: number }[] = [];
            answers.forEach((a) => {
                elapsed += a.duration;
                // Only add a data point if the question wasn't skipped (has words)
                if (a.wordCount > 0 && a.answer !== "(Skipped)") {
                    points.push({
                        time: elapsed,
                        wpm: a.wpm || 0,
                        wordCount: a.wordCount || 0
                    });
                }
            });
            return points;
        })()
        : metrics.wpmHistory.map((val, i) => ({
            time: (i + 1) * 5, // 5 second intervals
            wpm: val,
            wordCount: Math.round((val / 60) * 5) // approximate
        }));

    // Attempt to build markers from answers durations or segments
    const questionMarkers = (() => {
        if (!answers || !Array.isArray(answers)) return [];

        // Simpler fallback: just use the sequential durations
        let elapsed = 0;
        const markers: { time: number; label: string }[] = [];
        answers.forEach((a, i) => {
            elapsed += a.duration;
            // Only add a marker if the question wasn't skipped
            if (a.wordCount > 0 && a.answer !== "(Skipped)") {
                markers.push({ time: elapsed, label: `Q${i + 1}` });
            }
        });
        return markers;
    })();

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
    const postureScore = data.postureSummary?.score || Math.round(metrics.wpm > 0 ? 88 : 0);
    const postureIssues = metrics.issueCounts ? Object.entries(metrics.issueCounts)
        .filter(([_, count]) => count > 0)
        .map(([issue, _]) => issue.replace(/_/g, ' ').toLowerCase()) : [];

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
                className="bg-[#020202]/80 backdrop-blur-2xl w-full max-w-4xl h-[90vh] overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative custom-scrollbar flex flex-col"
            >
                {!hideGlobalHeader && (
                    <UnifiedHeader
                        section="Detailed Report"
                        backButton={{
                            href: "#",
                            label: "Close Report"
                        }}
                        onBackOverride={onClose}
                    />
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Header / Controls */}
                    <div className="sticky top-0 z-50 flex justify-between items-center p-6 bg-black/40 backdrop-blur-3xl border-b border-white/5">
                        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
                            <button
                                onClick={() => setCurrentReportIndex(0)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold tracking-tight ${currentReportIndex === 0
                                    ? "bg-primary text-white shadow-[0_0_20px_rgba(109,40,217,0.4)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Sparkles className={`w-4 h-4 ${currentReportIndex === 0 ? "text-white" : "text-white/30"}`} />
                                <span className="text-sm">General</span>
                            </button>

                            <button
                                onClick={() => setCurrentReportIndex(1)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold tracking-tight ${currentReportIndex === 1
                                    ? "bg-pink-600 text-white shadow-[0_0_20px_rgba(219,39,119,0.4)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Mic className={`w-4 h-4 ${currentReportIndex === 1 ? "text-white" : "text-white/30"}`} />
                                <span className="text-sm">Vocal</span>
                            </button>

                            <button
                                onClick={() => setCurrentReportIndex(2)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold tracking-tight ${currentReportIndex === 2
                                    ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Activity className={`w-4 h-4 ${currentReportIndex === 2 ? "text-white" : "text-white/30"}`} />
                                <span className="text-sm">Posture</span>
                            </button>

                            <button
                                onClick={() => setCurrentReportIndex(3)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold tracking-tight ${currentReportIndex === 3
                                    ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <BarChart3 className={`w-4 h-4 ${currentReportIndex === 3 ? "text-white" : "text-white/30"}`} />
                                <span className="text-sm">Content</span>
                            </button>

                            {data.lectureAnalysis && (
                                <button
                                    onClick={() => setCurrentReportIndex(4)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold tracking-tight ${currentReportIndex === 4
                                        ? "bg-amber-600 text-white shadow-[0_0_20px_rgba(217,119,6,0.4)]"
                                        : "text-white/40 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <Sparkles className={`w-4 h-4 ${currentReportIndex === 4 ? "text-white" : "text-white/30"}`} />
                                    <span className="text-sm">Lecture</span>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 rounded-xl px-4 h-10 transition-all font-bold"
                                onClick={downloadPDF}
                                disabled={isDownloading || isContentLoading || isAnalyzingContent}
                            >
                                {isDownloading || isContentLoading || isAnalyzingContent ? (
                                    <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                {isDownloading ? "Generating..." : (isContentLoading || isAnalyzingContent) ? "AI Analyzing..." : "Download PDF"}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 bg-primary/10 border border-primary/20 text-primary-foreground hover:bg-primary/20 hover:border-primary/40 rounded-xl px-4 h-10 transition-all font-bold shadow-[0_0_15px_rgba(109,40,217,0.2)]"
                                onClick={() => setIsSharing(true)}
                            >
                                <Share2 className="w-4 h-4" />
                                Share
                            </Button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Printable Content */}
                    <div ref={reportRef} className="p-8 space-y-8 bg-transparent min-h-full">

                        {currentReportIndex === 0 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* 1. Header */}
                                <div className="text-center space-y-3 pb-8 border-b border-white/5 relative">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/20 blur-[100px] pointer-events-none" />
                                    <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                                        General Performance Report
                                    </h1>
                                    <p className="text-white/40 text-sm font-bold tracking-widest uppercase">Generated by VoxLab AI</p>
                                </div >

                                {/* 2. Executive Summary & Score */}
                                < div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col md:flex-row gap-10 items-center shadow-xl hover:border-primary/30 transition-all duration-500 group" >
                                    <div className="flex-1 space-y-5">
                                        <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2.5">
                                            <Activity className="w-4 h-4" /> Executive Summary
                                        </h3>
                                        <p className="text-white/90 leading-relaxed text-xl font-medium">
                                            "{data.summary}"
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                        <CircularScoreChart
                                            score={data.score ?? 0}
                                            label="Overall Score"
                                            color="text-primary"
                                        />
                                    </div>
                                </div >

                                {/* 3. Key Metrics Grid */}
                                < div className="grid grid-cols-2 lg:grid-cols-4 gap-6" >
                                    {/* WPM */}
                                    < div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[1.5rem] border border-white/5 hover:border-white/20 transition-all duration-300" >
                                        <div className="flex items-center gap-2 text-white/40 mb-3">
                                            <Clock className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Average Pace</span>
                                        </div>
                                        <div className="text-3xl font-black text-white mb-1.5">{metrics.wpm} <span className="text-xs font-bold text-white/30 tracking-tight">WPM</span></div>
                                        <div className="text-[11px] font-bold text-white/40 uppercase tracking-tighter">
                                            {metrics.wpm < 110 ? "Slow Paced" : metrics.wpm > 160 ? "Fast Paced" : "Optimal Pace"}
                                        </div>
                                    </div >

                                    {/* Total Words */}
                                    <div className="p-6 rounded-[1.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-md hover:border-white/20 transition-all duration-300">
                                        <div className="flex items-center gap-2 text-white/40 mb-3">
                                            <TrendingUp className="w-4 h-4 text-indigo-400" /> <span className="text-[10px] font-bold uppercase tracking-widest">Total Words</span>
                                        </div>
                                        <div className="text-3xl font-black text-white mb-1.5">{metrics.totalWords}</div>
                                        <div className="text-[11px] font-bold text-white/40">
                                            {Math.floor(metrics.duration / 60)}m {(metrics.duration % 60).toFixed(0)}s Duration
                                        </div>
                                    </div>
                                    {/* Filler Words */}
                                    < div className={`p-6 rounded-[1.5rem] border backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 ${fillerTotal > 5 ? 'border-red-500/20' : 'border-emerald-500/20'}`
                                    }>
                                        <div className="flex items-center gap-2 text-white/40 mb-3">
                                            <AlertCircle className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Filler Words</span>
                                        </div>
                                        <div className={`text-3xl font-black mb-1.5 ${fillerTotal > 5 ? 'text-red-400' : 'text-emerald-400'}`}>{fillerTotal}</div>
                                        <div className="text-[11px] font-bold uppercase tracking-tighter opacity-60">{fillerTotal > 5 ? "Needs Attention" : "Great Clarity"}</div>
                                    </div >

                                    {/* Pauses */}
                                    < div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[1.5rem] border border-white/5 hover:border-white/20 transition-all duration-300" >
                                        <div className="flex items-center gap-2 text-white/40 mb-3">
                                            <Mic className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Pauses</span>
                                        </div>
                                        <div className="text-3xl font-black text-white mb-1.5">{metrics.pauseCount}</div>
                                        <div className="text-[11px] font-bold text-white/40 uppercase tracking-tighter">Detected Gaps</div>
                                    </div >
                                </div >

                                {/* Optional: Video Replay */}
                                {data.videoUrl && (
                                    <div className="space-y-4 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                        <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                            <Video className="w-4 h-4 text-primary" /> Session Recording
                                        </h3>
                                        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video relative group">
                                            <video
                                                src={data.videoUrl}
                                                controls
                                                className="w-full h-full object-contain"
                                                preload="metadata"
                                            />
                                            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none rounded-2xl" />
                                        </div>
                                    </div>
                                )}

                                {/* 4. Detailed Analysis Columns */}
                                < div className="grid md:grid-cols-2 gap-8" >

                                    {/* Filler Word Breakdown */}
                                    < div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5" >
                                        <h3 className="text-xs font-bold text-red-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                            <BarChart3 className="w-4 h-4" /> Word Breakdown
                                        </h3>
                                        {
                                            Object.keys(metrics.fillerCounts).length > 0 ? (
                                                <div className="space-y-4">
                                                    {Object.entries(metrics.fillerCounts).map(([word, count]) => (
                                                        <div key={word} className="flex items-center justify-between group">
                                                            <span className="text-white/70 text-sm font-medium capitalize">{word}</span>
                                                            <div className="flex items-center gap-4 flex-1 mx-6">
                                                                <div className="h-1.5 bg-white/5 rounded-full flex-1 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-red-500 animate-in slide-in-from-left duration-1000"
                                                                        style={{ width: `${Math.min((count / Math.max(fillerTotal, 1)) * 100, 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <span className="font-mono font-black text-white text-sm">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-white/20 text-sm font-medium italic">
                                                    No filler words detected. Perfect clarity.
                                                </div>
                                            )
                                        }
                                    </div >

                                    {/* Actionable Tips */}
                                    < div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 flex flex-col" >
                                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                            <Sparkles className="w-4 h-4" /> AI Recommendations
                                        </h3>
                                        <ul className="space-y-4 flex-1">
                                            {data.tips.map((tip, index) => (
                                                <li key={index} className="flex items-start gap-4 p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-[10px] border border-amber-500/20">
                                                        0{index + 1}
                                                    </span>
                                                    <p className="text-sm text-white/80 leading-relaxed font-medium">{tip}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div >
                                </div >

                                {/* Pace Analysis & Interval Breakdown */}
                                < div className="grid grid-cols-1 gap-8" >
                                    {/* Pace Analysis (New Graph Logic) */}
                                    < div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5" >
                                        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2.5">
                                            <Activity className="w-4 h-4" /> Pace Performance
                                        </h3>

                                        {/* Logic to calculate buckets matches speech-coach/page.tsx exactly */}
                                        {
                                            (() => {
                                                // 1. QUESTION-BASED BREAKDOWN (Preferred for Interviews)
                                                if (answers && answers.length > 0) {
                                                    const buckets = answers.map((a, i) => {
                                                        let color = "bg-primary";
                                                        let textColor = "text-primary";
                                                        if (a.wpm < 110 || a.wpm > 155) { color = "bg-red-500"; textColor = "text-red-500"; }
                                                        else if (a.wpm < 130 || a.wpm > 155) { color = "bg-amber-500"; textColor = "text-amber-500"; }

                                                        return {
                                                            intervalLabel: `Q${i + 1}`,
                                                            wpm: a.wpm,
                                                            wordCount: a.wordCount,
                                                            color,
                                                            textColor,
                                                            question: a.question
                                                        };
                                                    });

                                                    return (
                                                        <div className="space-y-10">
                                                            <div className="bg-black/20 p-6 rounded-2xl border border-white/10 shadow-inner">
                                                                <PacingChart dataPoints={wpmDataPoints} questionMarkers={questionMarkers} />
                                                            </div>

                                                            <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
                                                                <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Question Analysis</h4>
                                                                    <div className="flex gap-6 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                                        <span>WPM</span>
                                                                        <span>Words</span>
                                                                    </div>
                                                                </div>
                                                                <div className="divide-y divide-white/5">
                                                                    {buckets.map((b, i) => (
                                                                        <div key={i} className="px-8 py-6 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors">
                                                                            <div className="flex items-center gap-6">
                                                                                <div className="w-16 text-xs text-white/40 font-black shrink-0">{b.intervalLabel}</div>
                                                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                                    <div className={`h-full ${b.color} rounded-full`} style={{ width: `${Math.min((b.wpm / 180) * 100, 100)}%` }} />
                                                                                </div>
                                                                                <div className="flex gap-6 w-24 justify-end shrink-0 text-sm font-black font-mono">
                                                                                    <span className={b.textColor}>{b.wpm}</span>
                                                                                    <span className="text-white/20">{b.wordCount}</span>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-[11px] text-white/30 pl-20 font-medium italic">"{b.question}"</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // 2. TIME-BASED BUCKETS (Fallback / Practice Mode)
                                                const BUCKET_SIZE = 30; // 30 seconds
                                                const words = metrics.words || [];

                                                if (words.length === 0 && metrics.wpmHistory.length > 0) {
                                                    return (
                                                        <div className="space-y-6">
                                                            <div className="bg-black/20 p-6 rounded-2xl border border-white/10 shadow-inner">
                                                                <PacingChart dataPoints={wpmDataPoints} />
                                                            </div>
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

                                                    let color = "bg-primary";
                                                    let textColor = "text-primary";
                                                    if (wpm < 110 || wpm > 155) { color = "bg-red-500"; textColor = "text-red-500"; }
                                                    else if (wpm < 130 || wpm > 155) { color = "bg-amber-500"; textColor = "text-amber-500"; }

                                                    return { intervalLabel: `${startTime}-${endTime}s`, wpm, wordCount: count, color, textColor, time: endTime };
                                                });

                                                return (
                                                    <div className="space-y-10">
                                                        <div className="bg-black/20 p-6 rounded-2xl border border-white/10 shadow-inner">
                                                            <PacingChart dataPoints={wpmDataPoints} />
                                                        </div>
                                                        <div className="bg-white/[0.02] rounded-2xl border border-white/10 overflow-hidden">
                                                            <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Interval Performance</h4>
                                                                <div className="flex gap-6 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                                    <span>WPM</span>
                                                                    <span>Words</span>
                                                                </div>
                                                            </div>
                                                            <div className="divide-y divide-white/5">
                                                                {buckets.map((b, i) => (
                                                                    <div key={i} className="px-8 py-6 flex items-center gap-6 hover:bg-white/[0.02] transition-colors">
                                                                        <div className="w-20 text-[11px] text-white/40 font-mono font-bold shrink-0">{b.intervalLabel}</div>
                                                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                            <div className={`h-full ${b.color} rounded-full`} style={{ width: `${Math.min((b.wpm / 180) * 100, 100)}%` }} />
                                                                        </div>
                                                                        <div className="flex gap-6 w-24 justify-end shrink-0 text-sm font-black font-mono">
                                                                            <span className={b.textColor}>{b.wpm}</span>
                                                                            <span className="text-white/20">{b.wordCount}</span>
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
                                < div className="space-y-8" >

                                    {/* Audio Analysis Card (Matches SpeechCoachPage logic) */}
                                    < div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5" >
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-xs font-bold text-pink-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                <Mic className="w-4 h-4" /> Vocal Energy
                                            </h3>
                                            {audioStats && (
                                                <div className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${audioStats.stats.isMonotone ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"}`}>
                                                    {audioStats.stats.isMonotone ? "Monotone" : "Expressive"}
                                                </div>
                                            )}
                                        </div>

                                        {
                                            audioStats && metrics.pitchSamples && metrics.volumeSamples ? (
                                                <div className="space-y-8">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        {/* Pitch Range */}
                                                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center shadow-inner">
                                                            <div className="text-3xl font-black text-white leading-none mb-1">{audioStats.stats.pitchStdDev?.toFixed(1) || 0}</div>
                                                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Pitch Variety (st)</div>
                                                            <div className="mt-4 flex gap-1 justify-center">
                                                                {[1, 2, 3, 4, 5].map(i => (
                                                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${((audioStats.stats.pitchStdDev || 0) / 3) * 5 >= i ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-white/5"}`} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {/* Volume Consistency */}
                                                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center shadow-inner">
                                                            <div className="text-3xl font-black text-white leading-none mb-1">
                                                                {Math.round((1 - (audioStats.stats.quietPercentage || 0)) * 100)}%
                                                            </div>
                                                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Projection</div>
                                                            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                <div className={`h-full ${audioStats.stats.isTooQuiet ? "bg-red-500" : "bg-emerald-500"} shadow-[0_0_8px_rgba(16,185,129,0.3)]`} style={{ width: `${(1 - (audioStats.stats.quietPercentage || 0)) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Pitch Wave Graph */}
                                                    <div className="p-8 rounded-2xl bg-black/20 border border-white/5 shadow-inner">
                                                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-6">Pitch Contour (Intonation)</div>
                                                        <div className="h-40 w-full pt-4">
                                                            <PitchChart
                                                                pitchData={metrics.pitchSamples}
                                                                volumeData={metrics.volumeSamples}
                                                                color="#fbbf24"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-white/10 italic text-sm font-medium">
                                                    Audio analysis unavailable.
                                                </div>
                                            )
                                        }
                                    </div >

                                    {/* Pause Analysis Card (Matches SpeechCoachPage logic) */}
                                    < div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5" >
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                <Clock className="w-4 h-4" /> Pause Analysis
                                            </h3>
                                            {pauseStats && (
                                                <div className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    {Math.round(pauseStats.stats.pauseRatio * 100)}% Silence
                                                </div>
                                            )}
                                        </div>

                                        {
                                            pauseStats ? (
                                                <div className="space-y-8">
                                                    {/* Breakdown */}
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center shadow-inner">
                                                            <div className="text-3xl font-black text-white leading-none mb-1">{pauseStats.stats.emphasisCount}</div>
                                                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Emphasis Pauses</div>
                                                            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${(pauseStats.stats.emphasisCount / Math.max(pauseStats.stats.totalPauses, 1)) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                        <div className="p-6 rounded-2xl bg-black/20 border border-white/5 text-center shadow-inner">
                                                            <div className="text-3xl font-black text-amber-400 leading-none mb-1">{pauseStats.stats.thinkingCount}</div>
                                                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Thinking Pauses</div>
                                                            <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" style={{ width: `${(pauseStats.stats.thinkingCount / Math.max(pauseStats.stats.totalPauses, 1)) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Detailed Feedback */}
                                                    <div className={`p-6 rounded-[1.5rem] border backdrop-blur-sm transition-all duration-300 ${pauseStats.feedback.type === "good" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                                                        pauseStats.feedback.type === "warn" ? "bg-amber-500/5 border-amber-500/20 text-amber-400" :
                                                            "bg-red-500/5 border-red-500/20 text-red-400"
                                                        }`}>
                                                        <div className="flex gap-4">
                                                            <span className="shrink-0 text-xl">
                                                                {pauseStats.feedback.type === "good" ? "✨" : pauseStats.feedback.type === "warn" ? "⚠️" : "🚨"}
                                                            </span>
                                                            <p className="text-sm font-medium leading-relaxed">{pauseStats.feedback.message}</p>
                                                        </div>
                                                    </div>

                                                    {/* Stats Row */}
                                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20 pt-4 border-t border-white/5">
                                                        <span>Total Pauses: {pauseStats.stats.totalPauses}</span>
                                                        <span className={pauseStats.stats.breakdownCount > 0 ? "text-red-400" : ""}>
                                                            Breakdowns ({">"}2.5s): {pauseStats.stats.breakdownCount}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-white/10 italic text-sm font-medium">
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
                                <div className="text-center space-y-3 pb-8 border-b border-white/5 relative">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-pink-500/10 blur-[100px] pointer-events-none" />
                                    <h1 className="text-4xl font-black bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent tracking-tight">
                                        Vocal Analysis
                                    </h1>
                                    <p className="text-white/40 text-sm font-bold tracking-widest uppercase">Pacing, Articulation & Energy</p>
                                </div>

                                {/* Vocal Coach Summary & Score */}
                                {data.vocalSummary && (
                                    <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col md:flex-row gap-10 items-center mb-8 shadow-xl group">
                                        <div className="flex-1 space-y-5">
                                            <h3 className="text-xs font-bold text-pink-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                <Mic className="w-4 h-4" /> Vocal Coach Summary
                                            </h3>
                                            <p className="text-white/90 leading-relaxed text-xl font-medium">
                                                "{data.vocalSummary.summary}"
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                            <CircularScoreChart
                                                score={data.vocalSummary.score || Math.round(metrics.wpm > 0 ? 82 : 0)}
                                                label="Vocal Score"
                                                color="text-pink-500"
                                            />
                                        </div>
                                    </div>
                                )}
                                {/* Focus specifically on Vocal tips */}
                                {data.vocalSummary?.tips && data.vocalSummary.tips.length > 0 && (
                                    <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 flex flex-col">
                                        <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                            <span>💡</span> Vocal Recommendations
                                        </h3>
                                        <ul className="space-y-4 flex-1">
                                            {data.vocalSummary.tips.map((tip, index) => (
                                                <li key={index} className="flex items-start gap-3 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold text-xs border border-yellow-500/20">
                                                        {index + 1}
                                                    </span>
                                                    <p className="text-sm text-white/90 leading-snug pt-0.5">{tip}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* We moved Pace, PacingChart, Fillers, Pauses here as requested */}
                                {/* Pace Analysis Grid */}
                                < div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8" >
                                    {/* WPM */}
                                    < div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[1.5rem] border border-white/5 hover:border-white/20 transition-all duration-300" >
                                        <div className="flex items-center gap-2 text-white/40 mb-3">
                                            <Clock className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Average Pace</span>
                                        </div>
                                        <div className="text-3xl font-black text-white mb-1.5">{metrics.wpm} <span className="text-xs font-bold text-white/30 tracking-tight">WPM</span></div>
                                        <div className="text-[11px] font-bold text-white/40 uppercase tracking-tighter">
                                            {metrics.wpm < 110 ? "Slow Paced" : metrics.wpm > 160 ? "Fast Paced" : "Optimal Pace"}
                                        </div>
                                    </div >
                                    {/* Total Words */}
                                    < div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[1.5rem] border border-white/5 hover:border-white/20 transition-all duration-300" >
                                        <div className="flex items-center gap-2 text-white/40 mb-3">
                                            <TrendingUp className="w-4 h-4 text-indigo-400" /> <span className="text-[10px] font-bold uppercase tracking-widest">Total Words</span>
                                        </div>
                                        <div className="text-3xl font-black text-white mb-1.5">{metrics.totalWords}</div>
                                        <div className="text-[11px] font-bold text-white/40 uppercase tracking-tighter">Vocabulary Count</div>
                                    </div >
                                    {/* Filler Words */}
                                    < div className={`p-6 rounded-[1.5rem] border backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 ${fillerTotal > 5 ? 'border-red-500/20' : 'border-emerald-500/20'}`
                                    }>
                                        <div className="flex items-center gap-2 text-white/40 mb-3">
                                            <AlertCircle className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Filler Words</span>
                                        </div>
                                        <div className={`text-3xl font-black mb-1.5 ${fillerTotal > 5 ? 'text-red-400' : 'text-emerald-400'}`}>{fillerTotal}</div>
                                        <div className="text-[11px] font-bold uppercase tracking-tighter opacity-60">Speech Clarity</div>
                                    </div >
                                    {/* Pauses */}
                                    < div className="bg-white/[0.03] backdrop-blur-md p-6 rounded-[1.5rem] border border-white/5 hover:border-white/20 transition-all duration-300" >
                                        <div className="flex items-center gap-2 text-white/40 mb-3">
                                            <Mic className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Pauses</span>
                                        </div>
                                        <div className="text-3xl font-black text-white mb-1.5">{metrics.pauseCount}</div>
                                        <div className="text-[11px] font-bold text-white/40 uppercase tracking-tighter">Natural Gaps</div>
                                    </div >
                                </div >

                                {/* Filler Word Breakdown & Pause Analysis Columns */}
                                < div className="grid md:grid-cols-2 gap-8" >
                                    {/* Filler Word Breakdown */}
                                    < div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5" >
                                        <h3 className="text-xs font-bold text-red-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                            <BarChart3 className="w-4 h-4" /> Word Breakdown
                                        </h3>
                                        {
                                            Object.keys(metrics.fillerCounts).length > 0 ? (
                                                <div className="space-y-4">
                                                    {Object.entries(metrics.fillerCounts).map(([word, count]) => (
                                                        <div key={word} className="flex items-center justify-between group">
                                                            <span className="text-white/70 text-sm font-medium capitalize">{word}</span>
                                                            <div className="flex items-center gap-4 flex-1 mx-6">
                                                                <div className="h-1.5 bg-white/5 rounded-full flex-1 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-red-500 animate-in slide-in-from-left duration-1000"
                                                                        style={{ width: `${Math.min((count / Math.max(fillerTotal, 1)) * 100, 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <span className="font-mono font-black text-white text-sm">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-white/20 text-sm font-medium italic">
                                                    No filler words detected. Perfect clarity.
                                                </div>
                                            )
                                        }
                                    </div >

                                    {/* Pause Analysis Breakdown */}
                                    {metrics.pauseStats ? (
                                        <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                <Clock className="w-4 h-4" /> Pause Breakdown
                                            </h3>
                                            {/* Detailed Feedback */}
                                            <div className={`p-6 rounded-[1.5rem] border backdrop-blur-sm transition-all duration-300 ${metrics.pauseStats.feedback.type === "good" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                                                metrics.pauseStats.feedback.type === "warn" ? "bg-amber-500/5 border-amber-500/20 text-amber-400" :
                                                    "bg-red-500/5 border-red-500/20 text-red-400"
                                                }`}>
                                                <div className="flex gap-4">
                                                    <span className="shrink-0 text-xl">
                                                        {metrics.pauseStats.feedback.type === "good" ? "✨" : metrics.pauseStats.feedback.type === "warn" ? "⚠️" : "🚨"}
                                                    </span>
                                                    <p className="text-sm font-medium leading-relaxed">{metrics.pauseStats.feedback.message}</p>
                                                </div>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20 pt-4 border-t border-white/5 mt-6">
                                                <span>Total Pauses: {metrics.pauseStats.stats.totalPauses}</span>
                                                <span className={metrics.pauseStats.stats.breakdownCount > 0 ? "text-red-400" : ""}>
                                                    Breakdowns ({">"}2.5s): {metrics.pauseStats.stats.breakdownCount}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-white/10 italic text-sm font-medium">
                                            Pause breakdown unavailable.
                                        </div>
                                    )}
                                </div >

                                {/* Vocal Dynamics - Full Row */}
                                {metrics.pitchSamples && metrics.volumeSamples && (
                                    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 shadow-xl flex flex-col gap-8">
                                        {/* Header */}
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-xs font-bold text-pink-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                <Mic className="w-5 h-5" /> Vocal Dynamics
                                            </h3>
                                            <div className="px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-sm">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${!audioStats?.stats.isMonotone ? 'text-emerald-400' : 'text-white/40'}`}>
                                                    {!audioStats?.stats.isMonotone ? '✨ Expressive' : 'Monotone'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Pitch Variety */}
                                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center gap-2 min-h-[120px] shadow-inner">
                                                <div className="text-3xl font-black text-white leading-none">
                                                    {audioStats?.stats.pitchStdDev?.toFixed(1) || "0.0"}
                                                </div>
                                                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Pitch Variety (st)</div>
                                                {/* Dots indicator */}
                                                <div className="flex gap-1.5">
                                                    {[...Array(5)].map((_, i) => {
                                                        const stdDev = audioStats?.stats.pitchStdDev || 0;
                                                        const active = i < Math.min(5, Math.ceil(stdDev / 2));
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'bg-white/10'}`}
                                                            />
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Projection */}
                                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center gap-2 min-h-[120px] shadow-inner">
                                                <div className="text-3xl font-black text-white leading-none">
                                                    {Math.round((1 - (audioStats?.stats.quietPercentage || 0)) * 100)}%
                                                </div>
                                                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Projection</div>
                                                {/* Progress bar */}
                                                <div className="w-full max-w-[140px] h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                                                    <div
                                                        className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] rounded-full"
                                                        style={{ width: `${Math.round((1 - (audioStats?.stats.quietPercentage || 0)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pitch Contour (Intonation) */}
                                        <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                                            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-8">Pitch Contour (Trendline)</h4>
                                            <div className="h-44 w-full relative">
                                                <PitchChart
                                                    pitchData={metrics.pitchSamples}
                                                    volumeData={metrics.volumeSamples}
                                                    color="#ec4899"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PacingChart & Interval Breakdown Logic copied here */}
                                < div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 shadow-xl" >
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                            <Activity className="w-4 h-4" /> Pacing Analysis
                                        </h3>
                                        <div className="px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-sm">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Temporal Distribution</span>
                                        </div>
                                    </div>

                                    {/* Interval logic */}
                                    {(() => {
                                        if (answers && answers.length > 0) {
                                            const buckets = answers.map((a, i) => {
                                                const isSkipped = a.wordCount === 0 || a.answer === "(Skipped)";
                                                let color = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
                                                let textColor = "text-emerald-400";

                                                if (isSkipped) {
                                                    color = "bg-white/10";
                                                    textColor = "text-white/20";
                                                } else if (a.wpm < 110 || a.wpm > 155) {
                                                    color = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
                                                    textColor = "text-red-400";
                                                } else if (a.wpm < 130 || a.wpm > 155) {
                                                    color = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
                                                    textColor = "text-amber-400";
                                                }

                                                return {
                                                    intervalLabel: `Question ${i + 1}`,
                                                    wpm: a.wpm,
                                                    wordCount: a.wordCount,
                                                    color,
                                                    textColor,
                                                    question: a.question,
                                                    isSkipped
                                                };
                                            });

                                            return (
                                                <div className="space-y-10">
                                                    <div className="bg-black/20 p-8 rounded-2xl border border-white/5 shadow-inner">
                                                        <PacingChart dataPoints={wpmDataPoints} questionMarkers={questionMarkers} />
                                                    </div>
                                                    <div className="bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
                                                        <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.03]">
                                                            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Interval Breakdown</h4>
                                                            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-white/20">
                                                                <span className="w-16 text-right">WPM</span>
                                                                <span className="w-16 text-right">Words</span>
                                                            </div>
                                                        </div>
                                                        <div className="divide-y divide-white/5">
                                                            {buckets.map((b, i) => (
                                                                <div key={i} className={`px-8 py-6 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors group ${b.isSkipped ? 'opacity-40' : ''}`}>
                                                                    <div className="flex items-center gap-6">
                                                                        <div className="w-24 text-xs text-white/40 font-black uppercase tracking-widest shrink-0">{b.intervalLabel}</div>
                                                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                            <div className={`h-full ${b.color} rounded-full transition-all duration-1000`} style={{ width: `${Math.min((b.wpm / 180) * 100, 100)}%` }} />
                                                                        </div>
                                                                        <div className="flex gap-8 w-40 justify-end shrink-0 text-xs font-black font-mono tracking-tighter">
                                                                            <span className={`${b.textColor} w-16 text-right`}>{b.isSkipped ? "SKIP" : b.wpm}</span>
                                                                            <span className="text-white/40 w-16 text-right">{b.wordCount}</span>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[11px] text-white/30 pl-3 group-hover:text-white/50 transition-colors border-l border-white/5 ml-[104px] italic">"{b.question}"</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const BUCKET_SIZE = 30; // 30 seconds
                                        const words = metrics.words || [];
                                        if (words.length === 0 && metrics.wpmHistory.length > 0) {
                                            return (
                                                <div className="space-y-6">
                                                    <div className="bg-black/20 p-8 rounded-2xl border border-white/5 shadow-inner">
                                                        <PacingChart dataPoints={wpmDataPoints} />
                                                    </div>
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
                                            let color = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
                                            let textColor = "text-emerald-400";
                                            if (wpm < 110 || wpm > 155) { color = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"; textColor = "text-red-400"; }
                                            else if (wpm < 130 || wpm > 155) { color = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"; textColor = "text-amber-400"; }
                                            return { intervalLabel: `${startTime}s – ${endTime}s`, wpm, wordCount: count, color, textColor, time: endTime };
                                        });
                                        return (
                                            <div className="space-y-10">
                                                <div className="bg-black/20 p-8 rounded-2xl border border-white/5 shadow-inner">
                                                    <PacingChart dataPoints={wpmDataPoints} />
                                                </div>
                                                <div className="bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
                                                    <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.03]">
                                                        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Interval Breakdown</h4>
                                                        <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-white/20">
                                                            <span className="w-16 text-right">WPM</span>
                                                            <span className="w-16 text-right">Words</span>
                                                        </div>
                                                    </div>
                                                    <div className="divide-y divide-white/5">
                                                        {buckets.map((b, i) => (
                                                            <div key={i} className="px-8 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                                                <div className="flex items-center gap-6 flex-1">
                                                                    <div className="w-28 text-xs text-white/40 font-black uppercase tracking-widest shrink-0">{b.intervalLabel}</div>
                                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-md">
                                                                        <div className={`h-full ${b.color} rounded-full transition-all duration-1000`} style={{ width: `${Math.min((b.wpm / 180) * 100, 100)}%` }} />
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-8 w-40 justify-end shrink-0 text-xs font-black font-mono tracking-tighter">
                                                                    <span className={`${b.textColor} w-16 text-right`}>{b.wpm}</span>
                                                                    <span className="text-white/40 w-16 text-right">{b.wordCount}</span>
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
                                <div className="text-center space-y-3 pb-8 border-b border-white/5 relative">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/10 blur-[100px] pointer-events-none" />
                                    <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                                        Posture & Presence
                                    </h1>
                                    <p className="text-white/40 text-sm font-bold tracking-widest uppercase">Body Language Analysis</p>
                                </div>

                                {/* Posture Coach Summary & Score */}
                                {data.postureSummary && (
                                    <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col md:flex-row gap-10 items-center shadow-xl group">
                                        <div className="flex-1 space-y-5">
                                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                <Activity className="w-4 h-4" /> Body Language Coach
                                            </h3>
                                            <p className="text-white/90 leading-relaxed text-xl font-medium">
                                                "{data.postureSummary.summary}"
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                            <CircularScoreChart
                                                score={data.postureSummary.score || Math.round(metrics.wpm > 0 ? 88 : 0)}
                                                label="Posture Score"
                                                color="text-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Issue Counts Breakdown */}
                                    <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                        <h3 className="text-xs font-bold text-red-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                            <AlertTriangle className="w-4 h-4" /> Detected Issues
                                        </h3>
                                        {
                                            metrics.issueCounts && Object.keys(metrics.issueCounts).length > 0 ? (
                                                <div className="space-y-4">
                                                    {Object.entries(metrics.issueCounts).map(([issue, count]) => (
                                                        <div key={issue} className="flex items-center justify-between group">
                                                            <span className="text-white/70 text-sm font-medium capitalize">{issue.replace(/_/g, ' ').toLowerCase()}</span>
                                                            <div className="flex items-center gap-4 flex-1 mx-6">
                                                                <div className="h-1.5 bg-white/5 rounded-full flex-1 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-red-500/50 rounded-full"
                                                                        style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <span className="font-mono font-black text-white text-sm">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-emerald-400/60 text-sm font-medium italic">
                                                    No significant posture issues detected. Great form! 🌟
                                                </div>
                                            )
                                        }
                                    </div>

                                    {/* Posture Recommendations */}
                                    <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 flex flex-col">
                                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                            <Sparkles className="w-4 h-4" /> AI Tips
                                        </h3>
                                        <ul className="space-y-4 flex-1">
                                            {data.postureSummary?.tips && data.postureSummary.tips.length > 0 ? (
                                                data.postureSummary.tips.map((tip, index) => (
                                                    <li key={index} className="flex items-start gap-4 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-[10px] border border-blue-500/20">
                                                            0{index + 1}
                                                        </span>
                                                        <p className="text-sm text-white/80 leading-relaxed font-medium">{tip}</p>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-center py-8 text-white/20 text-sm italic">
                                                    No specific postural tips available for this session.
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentReportIndex === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* 1. Header */}
                                <div className="text-center space-y-3 pb-8 border-b border-white/5 relative">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/10 blur-[100px] pointer-events-none" />
                                    <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent tracking-tight">
                                        Content Analysis
                                    </h1>
                                    <p className="text-white/40 text-sm font-bold tracking-widest uppercase">Messaging & Structure</p>
                                    {metrics.topic && (
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mt-4 backdrop-blur-sm">
                                            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Topic:</span>
                                            <span className="text-white text-sm font-bold">{metrics.topic}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Topic Relevance Analysis — Only shown when a topic was selected */}
                                {data.topicAnalysis && (
                                    <div className="space-y-6">
                                        {/* Relevance Score + Summary */}
                                        <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col md:flex-row gap-8 items-center shadow-xl group">
                                            <div className="flex-1 space-y-4">
                                                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                    🎯 Topic Relevance
                                                </h3>
                                                <p className="text-white/90 leading-relaxed text-xl font-medium">
                                                    {data.topicAnalysis.relevanceScore >= 80
                                                        ? "Your speech strongly addressed the topic with relevant points and arguments."
                                                        : data.topicAnalysis.relevanceScore >= 50
                                                            ? "Your speech partially covered the topic but missed some important angles."
                                                            : "Your speech needs more focus on the assigned topic. Consider restructuring around key arguments."}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                                <CircularScoreChart
                                                    score={data.topicAnalysis.relevanceScore}
                                                    label="Relevance"
                                                    color="text-emerald-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Covered Points & Missed Angles */}
                                        <div className="grid md:grid-cols-2 gap-8">
                                            {/* Covered Points */}
                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    ✅ Points Covered
                                                </h3>
                                                {data.topicAnalysis.coveredPoints.length > 0 ? (
                                                    <ul className="space-y-4">
                                                        {data.topicAnalysis.coveredPoints.map((point, i) => (
                                                            <li key={i} className="flex items-start gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold">✓</span>
                                                                <p className="text-sm text-white/90 leading-snug">{point}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-white/20 italic text-sm text-center py-8">No specific topic points were identified.</p>
                                                )}
                                            </div>

                                            {/* Missed Angles */}
                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    ⚠️ Missed Angles
                                                </h3>
                                                {data.topicAnalysis.missedAngles.length > 0 ? (
                                                    <ul className="space-y-4">
                                                        {data.topicAnalysis.missedAngles.map((angle, i) => (
                                                            <li key={i} className="flex items-start gap-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">!</span>
                                                                <p className="text-sm text-white/90 leading-snug">{angle}</p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-emerald-400/60 italic text-sm text-center py-8">Great coverage — no major angles missed! ✨</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content Suggestions */}
                                        {data.topicAnalysis.contentSuggestions.length > 0 && (
                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    💡 Suggested Additions
                                                </h3>
                                                <ul className="space-y-4">
                                                    {data.topicAnalysis.contentSuggestions.map((suggestion, i) => (
                                                        <li key={i} className="flex items-start gap-4 p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10">
                                                            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-black text-[10px] border border-cyan-500/20">
                                                                0{i + 1}
                                                            </span>
                                                            <p className="text-sm text-white/90 leading-snug pt-0.5">{suggestion}</p>
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
                                        <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col md:flex-row gap-8 items-center shadow-xl group">
                                            <div className="flex-1 space-y-4">
                                                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                    <FileText className="w-4 h-4" /> Slide Alignment
                                                </h3>
                                                <p className="text-white/90 leading-relaxed text-xl font-medium">
                                                    {data.slideAnalysis.feedback}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                                <CircularScoreChart
                                                    score={data.slideAnalysis.alignmentScore}
                                                    label="Alignment"
                                                    color="text-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    ✅ Points Covered
                                                </h3>
                                                <ul className="space-y-4">
                                                    {data.slideAnalysis.coveredPoints.map((point, i) => (
                                                        <li key={i} className="flex items-start gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold">✓</span>
                                                            <p className="text-sm text-white/90 leading-snug">{point}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    ⚠️ Missed Points
                                                </h3>
                                                <ul className="space-y-4">
                                                    {data.slideAnalysis.missedPoints.length > 0 ? data.slideAnalysis.missedPoints.map((point, i) => (
                                                        <li key={i} className="flex items-start gap-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">!</span>
                                                            <p className="text-sm text-white/90 leading-snug">{point}</p>
                                                        </li>
                                                    )) : <p className="text-emerald-400/60 italic text-sm text-center py-8">All key points were covered!</p>}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Rubric Analysis */}
                                {data.rubricAnalysis && (
                                    <div className="space-y-6">
                                        <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col md:flex-row gap-8 items-center shadow-xl group">
                                            <div className="flex-1 space-y-4">
                                                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                    <AlertCircle className="w-4 h-4" /> Rubric Evaluation
                                                </h3>
                                                <p className="text-white/90 leading-relaxed text-xl font-medium">
                                                    {data.rubricAnalysis.feedback}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                                <CircularScoreChart
                                                    score={data.rubricAnalysis.rubricScore}
                                                    label="Rubric Score"
                                                    color="text-purple-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    🌟 Key Strengths
                                                </h3>
                                                <ul className="space-y-4">
                                                    {data.rubricAnalysis.strengths.map((str, i) => (
                                                        <li key={i} className="flex items-start gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold">✓</span>
                                                            <p className="text-sm text-white/90 leading-snug">{str}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-rose-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    📉 Areas to Improve
                                                </h3>
                                                <ul className="space-y-4">
                                                    {data.rubricAnalysis.weaknesses.map((weakness, i) => (
                                                        <li key={i} className="flex items-start gap-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-[10px] font-bold">↓</span>
                                                            <p className="text-sm text-white/90 leading-snug">{weakness}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Content Heuristic Score - For Practice Mode */}
                                {/* Content Strategy - Practice Mode */}
                                {!data.interviewEvaluation && (
                                    <div className="space-y-6">
                                        <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col md:flex-row gap-8 items-center shadow-xl group">
                                            <div className="flex-1 space-y-4">
                                                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                                    📚 Content Strategy
                                                </h3>
                                                <p className="text-white/90 leading-relaxed text-xl font-medium">
                                                    {localContentScore >= 80
                                                        ? "Your session content is exceptionally well-structured and impactful."
                                                        : localContentScore >= 60
                                                            ? "Your session content is clear but could benefit from more specific examples or data points."
                                                            : "Your session content lacks depth. Consider using the AI Coach's suggestions to expand your main points."}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                                <CircularScoreChart
                                                    score={localContentScore}
                                                    label="Content Score"
                                                    color="text-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Interview Section */}
                                {data.interviewEvaluation && (
                                    <div className="space-y-8">
                                        {/* Hiring Recommendation & Overall Score */}
                                        <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 shadow-xl group">
                                            <div className="flex flex-col md:flex-row items-center gap-10">
                                                <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                                    <CircularScoreChart
                                                        score={data.interviewEvaluation.overallScore}
                                                        label="Executive Score"
                                                        color="text-indigo-500"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-6">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Recommendation:</span>
                                                        <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all duration-300 ${data.interviewEvaluation.hiringRecommendation.toLowerCase().includes('hire')
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                                            }`}>
                                                            {data.interviewEvaluation.hiringRecommendation}
                                                        </div>
                                                    </div>
                                                    <p className="text-white/90 text-xl font-medium leading-relaxed italic">
                                                        "{data.interviewEvaluation.overallFeedback}"
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 border-t border-white/5 pt-8">
                                                {[
                                                    { label: "Communication", score: data.interviewEvaluation.communicationScore, color: "bg-blue-500", icon: MessageSquare },
                                                    { label: "Technical", score: data.interviewEvaluation.technicalScore, color: "bg-purple-500", icon: Brain },
                                                    { label: "Behavioral", score: data.interviewEvaluation.behavioralScore, color: "bg-amber-500", icon: Users },
                                                    { label: "Confidence", score: data.interviewEvaluation.confidenceScore, color: "bg-emerald-500", icon: Zap },
                                                ].map((stat) => (
                                                    <div key={stat.label} className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                        <div className="flex items-center gap-2 text-white/30 mb-3">
                                                            <stat.icon className="w-3.5 h-3.5" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{stat.label}</span>
                                                        </div>
                                                        <div className="text-3xl font-black text-white mb-3 leading-none">{stat.score}</div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full ${stat.color} rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]`} style={{ width: `${stat.score}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Top Strengths & Improvements */}
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    <Target className="w-4 h-4" /> Top Strengths
                                                </h3>
                                                <ul className="space-y-4">
                                                    {data.interviewEvaluation.topStrengths.map((s, i) => (
                                                        <li key={i} className="flex items-start gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                            <span className="text-sm text-white/90 leading-snug">{s}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                                    <AlertTriangle className="w-4 h-4" /> Growth Areas
                                                </h3>
                                                <ul className="space-y-4">
                                                    {data.interviewEvaluation.topImprovements.map((s, i) => (
                                                        <li key={i} className="flex items-start gap-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                            <span className="text-sm text-white/90 leading-snug">{s}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Question Breakdown */}
                                        <div className="space-y-6 pt-4">
                                            <h3 className="text-xs font-bold text-white/20 uppercase tracking-[0.3em] pl-4">Detailed Question Evaluation</h3>
                                            {data.interviewEvaluation.questionEvaluations.map((qe, idx) => (
                                                <div key={idx} className="bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden group hover:border-white/10 transition-colors">
                                                    <div className="p-8 space-y-8">
                                                        <div className="flex items-start justify-between gap-8">
                                                            <div className="space-y-4 flex-1">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-black bg-white/10 text-white/60 px-2.5 py-1 rounded shadow-sm uppercase tracking-widest">Question {idx + 1}</span>
                                                                </div>
                                                                <p className="text-xl text-white font-medium leading-relaxed italic">"{qe.question}"</p>
                                                            </div>
                                                            <div className="text-center bg-white/[0.05] rounded-2xl px-6 py-4 border border-white/10 group-hover:scale-105 transition-transform duration-500">
                                                                <div className="text-3xl font-black text-indigo-400 leading-none mb-1.5">{qe.score}</div>
                                                                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Score</div>
                                                            </div>
                                                        </div>

                                                        <div className="grid md:grid-cols-2 gap-8">
                                                            <div className="space-y-6">
                                                                <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
                                                                    <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">
                                                                        <Mic className="w-3.5 h-3.5" /> Your Response
                                                                    </div>
                                                                    <p className="text-sm text-white/70 leading-relaxed font-medium line-clamp-4">"{qe.answer}"</p>
                                                                </div>
                                                                <div className="flex gap-4">
                                                                    {[
                                                                        { label: "Relevance", score: qe.relevanceScore },
                                                                        { label: "Depth", score: qe.depthScore },
                                                                        { label: "Comm.", score: qe.communicationScore },
                                                                    ].map(s => (
                                                                        <div key={s.label} className="flex-1 text-center py-3 bg-white/[0.03] rounded-2xl border border-white/5">
                                                                            <div className="text-sm font-black text-white mb-0.5">{s.score}</div>
                                                                            <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">{s.label}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-6">
                                                                <div className="bg-indigo-500/5 rounded-2xl p-6 border border-indigo-500/10">
                                                                    <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                                                                        <Sparkles className="w-3.5 h-3.5" /> Ideal Concept
                                                                    </div>
                                                                    <p className="text-sm text-indigo-100/60 leading-relaxed font-medium">{qe.idealAnswer}</p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-3">
                                                                        <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                                                                            <Check className="w-3 h-3" /> Strengths
                                                                        </span>
                                                                        <ul className="space-y-2">
                                                                            {qe.strengths.slice(0, 2).map((s, i) => (
                                                                                <li key={i} className="text-[11px] text-white/50 flex items-start gap-2 leading-tight">
                                                                                    <span className="text-emerald-500/30 mt-1 flex-shrink-0">•</span>
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
                                <div className="bg-white/[0.03] backdrop-blur-md rounded-[2rem] p-8 border border-white/10 flex flex-col md:flex-row gap-10 items-center shadow-xl group">
                                    <div className="flex-1 space-y-4">
                                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                                            <Sparkles className="w-4 h-4" /> Instructional Clarity
                                        </h3>
                                        <p className="text-white/90 leading-relaxed text-xl font-medium italic">
                                            "{data.lectureAnalysis.clarityFeedback}"
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                        <CircularScoreChart
                                            score={data.lectureAnalysis.teachingScore}
                                            label="Clarity Score"
                                            color="text-amber-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Potential Confusions */}
                                    <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                        <h3 className="text-xs font-bold text-orange-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                            ⚠️ Student Blindspots
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-4">Areas that might be confusing for someone new to the material.</p>
                                        <ul className="space-y-4">
                                            {data.lectureAnalysis.potentialConfusion.map((item, i) => (
                                                <li key={i} className="flex items-start gap-4 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold">!</span>
                                                    <p className="text-sm text-slate-200">{item}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Analogy Suggestions */}
                                    <div className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2.5">
                                            💡 Power Analogies
                                        </h3>
                                        <p className="text-xs text-slate-400 mb-4">AI-suggested comparisons to make complex parts stick.</p>
                                        <ul className="space-y-4">
                                            {data.lectureAnalysis.analogies.map((analogy, i) => (
                                                <li key={i} className="flex items-start gap-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold">?</span>
                                                    <p className="text-sm text-slate-200 italic">{analogy}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
            {/* Session Context Chatbot moved outside to avoid transform trapping */}
            <SessionChatbot reportData={{ ...data, contentAnalysis: streamedContentAnalysis }} />

            {/* Share to Forum Modal moved outside */}
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

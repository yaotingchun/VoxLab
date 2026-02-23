"use client";

import { useRef, useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { Download, X, Activity, Mic, Clock, BarChart3, AlertCircle, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, Video, Type, Share2, FileCheck2 } from "lucide-react";
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

interface DetailedSessionReportProps {
    data: {
        summary: string;
        tips: string[];
        score?: number;
        vocalSummary?: { summary: string; tips: string[]; score?: number } | null;
        postureSummary?: { summary: string; tips: string[]; score?: number } | null;
        videoUrl?: string | null; // Newly added video URL from GCS
        complianceReport?: any;
        rubric?: any;
        rawMetrics?: {
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

    // Calculate max tabs based on availability of Compliance Report data
    const hasComplianceData = !!data.complianceReport || !!data.rubric;
    const maxTabIndex = hasComplianceData ? 4 : 3;

    const [currentReportIndex, setCurrentReportIndex] = useState<number>(0);
    // 0: General, 1: Vocal, 2: Posture, 3: Content, 4: Compliance (optional)

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
        id: "content-coach"
    });

    const isContentLoading = contentStatus === 'submitted' || contentStatus === 'streaming';
    const [hasTriggeredContent, setHasTriggeredContent] = useState(false);

    // Auto-analyze transcript when report opens
    // DISABLED: Triggers a TypeError during hydration in this environment.
    // useEffect(() => {
    //     if (!hasTriggeredContent && metrics.transcript && sendContentMessage) {
    //         setHasTriggeredContent(true);
    //         setIsAnalyzingContent(true);
    //
    //         sendContentMessage({
    //             role: 'user',
    //             content: `Please analyze this speech script, giving me feedback and structural tips:\n\n${metrics.transcript}`
    //         } as any).finally(() => {
    //             setIsAnalyzingContent(false);
    //         });
    //     }
    // }, [metrics.transcript, sendContentMessage, hasTriggeredContent]);

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
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentReportIndex((prev) => (prev > 0 ? prev - 1 : maxTabIndex))}
                            className="text-slate-400 hover:text-white"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 min-w-[140px] justify-center">
                            {currentReportIndex === 0 && <><span className="text-purple-400">⚡</span> General</>}
                            {currentReportIndex === 1 && <><Mic className="w-5 h-5 text-pink-400" /> Vocal</>}
                            {currentReportIndex === 2 && <><Activity className="w-5 h-5 text-blue-400" /> Posture</>}
                            {currentReportIndex === 3 && <><BarChart3 className="w-5 h-5 text-green-400" /> Content</>}
                            {currentReportIndex === 4 && <><FileCheck2 className="w-5 h-5 text-yellow-500" /> Compliance</>}
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentReportIndex((prev) => (prev < maxTabIndex ? prev + 1 : 0))}
                            className="text-slate-400 hover:text-white"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
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
                                < div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50" >
                                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <Type className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Total Words</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-1">{metrics.totalWords}</div>
                                    <div className="text-xs text-slate-400">Duration: {Math.floor(metrics.duration / 60)}m {metrics.duration % 60}s</div>
                                </div >

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
                            </div>

                            <div className="flex flex-col gap-6">

                                {/* Content Summary & Score Header */}
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

                                {/* Transcript Column */}
                                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                                            <Mic className="w-4 h-4" /> Live Transcript
                                        </h3>
                                    </div>
                                    <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 overflow-y-auto max-h-[500px] flex-1 text-slate-300 leading-relaxed custom-scrollbar whitespace-pre-wrap">
                                        {metrics.transcript || "No transcript recorded for this session."}
                                    </div>
                                </div>

                                {/* AI Analysis Column */}
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
                            </div>
                        </div>
                    )}

                    {currentReportIndex === 4 && hasComplianceData && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Header */}
                            <div className="text-center space-y-2 pb-6 border-b border-slate-800">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                                    Rubric Compliance
                                </h1>
                                <p className="text-slate-400 text-sm">Evaluation against your uploaded grading criteria</p>
                            </div>

                            {data.complianceReport && (
                                <>
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col md:flex-row gap-8 items-center">
                                        <div className="flex-1 space-y-4">
                                            <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                                                <FileCheck2 className="w-4 h-4" /> Compliance Overview
                                            </h3>
                                            <p className="text-slate-200 leading-relaxed text-lg">
                                                Based on your transcript and physical delivery, the AI has evaluated how closely you followed the rubric.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <CircularScoreChart
                                                score={data.complianceReport.overallComplianceScore}
                                                label="Compliance Score"
                                                color="text-yellow-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Evaluation Criteria Grid */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-blue-400" /> Criteria Breakdown
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Topic Alignment */}
                                            {data.complianceReport.topicAlignment && (
                                                <div className={`p-5 rounded-2xl border bg-slate-800/30 ${data.complianceReport.topicAlignment.score >= 70 ? 'border-green-500/30' : 'border-amber-500/30'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2 text-slate-400">
                                                            <Type className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Topic Alignment</span>
                                                        </div>
                                                        <span className={`text-sm font-bold ${data.complianceReport.topicAlignment.score >= 70 ? 'text-green-400' : 'text-amber-400'}`}>{data.complianceReport.topicAlignment.score}/100</span>
                                                    </div>
                                                    <p className="text-sm text-slate-300">{data.complianceReport.topicAlignment.feedback}</p>
                                                </div>
                                            )}

                                            {/* Emotional Congruence */}
                                            {data.complianceReport.emotionalCongruence && (
                                                <div className={`p-5 rounded-2xl border bg-slate-800/30 ${data.complianceReport.emotionalCongruence.isCongruent ? 'border-green-500/30' : 'border-red-500/30'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2 text-slate-400">
                                                            <Activity className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Emotional Congruence</span>
                                                        </div>
                                                        <span className={`text-sm font-bold ${data.complianceReport.emotionalCongruence.isCongruent ? 'text-green-400' : 'text-red-400'}`}>
                                                            {data.complianceReport.emotionalCongruence.isCongruent ? 'Congruent' : 'Mismatch'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-300">{data.complianceReport.emotionalCongruence.feedback}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Specific Rubric Points */}
                                    {data.complianceReport.rubricEvaluation && data.complianceReport.rubricEvaluation.length > 0 && (
                                        <div className="space-y-4 pt-4">
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-purple-400" /> Rubric Requirements
                                            </h3>
                                            <div className="grid grid-cols-1 gap-4">
                                                {data.complianceReport.rubricEvaluation.map((evalItem: any, i: number) => (
                                                    <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/40">
                                                        <div className="shrink-0 mt-1">
                                                            {evalItem.followed ? (
                                                                <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">✅</div>
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">❌</div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-semibold text-white">{evalItem.criterion}</h4>
                                                                <span className="text-sm font-bold text-slate-400">{evalItem.score}/100</span>
                                                            </div>
                                                            <p className="text-sm text-slate-300">{evalItem.feedback}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Improvement Tips */}
                                    {data.complianceReport.improvementTips && data.complianceReport.improvementTips.length > 0 && (
                                        <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 flex flex-col mt-6">
                                            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <span>💡</span> Compliance Recommendations
                                            </h3>
                                            <ul className="space-y-4">
                                                {data.complianceReport.improvementTips.map((tip: string, index: number) => (
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
                                </>
                            )}

                            {!data.complianceReport && data.rubric && (
                                <div className="p-8 text-center text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                                    A rubric was provided, but the compliance report is still generating or failed to generate.
                                </div>
                            )}
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

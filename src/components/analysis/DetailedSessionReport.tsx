"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, X, Activity, Mic, Clock, BarChart3, AlertCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { PacingChart } from "./PacingChart";
import { PitchChart } from "@/components/PitchChart";
import { PauseStats } from "@/lib/pause-analysis";
import { PrintableReportTemplate } from "./PrintableReportTemplate";

interface DetailedSessionReportProps {
    data: {
        summary: string;
        tips: string[];
        rawMetrics?: {
            duration: number;
            wpm: number;
            totalWords: number;
            fillerCounts: Record<string, number>;
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
        pauseCount: 0,
        wpmHistory: [],
        pauseStats: undefined,
        audioMetrics: undefined,
        volumeSamples: [],
        pitchSamples: [],
        transcript: ""
    };

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

    return (
        <>
            {/* Hidden Printable Template (Rendered off-screen) */}
            <div className="fixed top-0 left-[-9999px] w-[794px] min-h-[1123px] overflow-visible pointer-events-none z-[-50]">
                <PrintableReportTemplate data={data} metrics={metrics} />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 w-full max-w-4xl h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 shadow-2xl relative custom-scrollbar flex flex-col"
            >
                {/* Header / Controls */}
                <div className="sticky top-0 z-50 flex justify-between items-center p-6 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-purple-400">⚡</span> Session Report
                    </h2>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                            onClick={downloadPDF}
                            disabled={isDownloading}
                        >
                            {isDownloading ? (
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            {isDownloading ? "Generating..." : "Download PDF"}
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

                    {/* 1. Header */}
                    <div className="text-center space-y-2 pb-6 border-b border-slate-800">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Presentation Performance Analysis
                        </h1>
                        <p className="text-slate-400 text-sm">Generated by VoxLab AI</p>
                    </div >

                    {/* 2. Executive Summary */}
                    < div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50" >
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Executive Summary
                        </h3>
                        <p className="text-slate-200 leading-relaxed text-lg">
                            "{data.summary}"
                        </p>
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
                                <TypeIcon className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Total Words</span>
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
                </div >
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

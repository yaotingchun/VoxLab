"use client";

import { useRouter } from "next/navigation";
import { DetailedSessionReport } from "@/components/analysis/DetailedSessionReport";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function SampleReportPage() {
    const router = useRouter();

    // Reconstruct the report data structure expected by DetailedSessionReport
    const mockReportData = {
        summary: "This was a strong baseline performance. You projected confidence and had excellent posture throughout. Your pacing was generally good, though you sped up slightly during complex explanations. The main area for improvement is reducing reliance on filler words like 'um' and 'like', which slightly diminished your authoritative tone. Overall, a very solid presentation.",
        tips: [
            "Take a deliberate breath before answering complex questions to avoid using 'um' as a crutch.",
            "You effectively used hand gestures to emphasize key points—continue doing this.",
            "When transitioning between slides, pause for a full second to let the audience absorb the information.",
            "Your vocal variety is good, but try dropping your pitch slightly at the end of definitive statements."
        ],
        score: 84,
        topicAnalysis: {
            relevanceScore: 90,
            coveredPoints: ["Introduction to AI", "Benefits of machine learning", "Future outlook"],
            missedAngles: ["Ethical considerations", "Implementation costs"],
            contentSuggestions: ["Try to weave in a short, relatable anecdote when discussing abstract concepts."]
        },
        lectureAnalysis: null,
        vocalSummary: {
            summary: "Good projection and generally varied intonation. Pace was mostly within the targeted zone.",
            tips: ["Practice pausing instead of filling silence.", "Use more pauses for emphasis."],
            score: 78
        },
        postureSummary: null, // Removed facial features based on recent PRs
        videoUrl: undefined, // No video for the sample
        rawMetrics: {
            topic: "The Future of AI in Education",
            duration: 185, // ~3 minutes
            wpm: 142,
            totalWords: 438,
            fillerCounts: {
                "um": 6,
                "like": 4,
                "uh": 2,
                "you know": 1
            },
            pauseCount: 12,
            wpmHistory: [130, 135, 140, 155, 160, 145, 142, 138, 140, 148, 152, 140],
            pauseStats: {
                stats: {
                    totalPauses: 12,
                    averageDuration: 1.2,
                    longestPause: 2.5,
                    pauseRatio: 0.15,
                    emphasisCount: 8,
                    thinkingCount: 4
                },
                feedback: { message: "Good use of pauses for emphasis, though some thinking pauses were a bit long.", type: "good" as "good" | "warn" | "bad" }
            },
            audioMetrics: {
                averageVolume: 65,
                pitchRange: 22,
                isMonotone: false,
                isTooQuiet: false,
                pitchStdDev: 3.2,
                quietPercentage: 0.05
            },
            volumeSamples: Array.from({ length: 60 }, () => Math.random() * 40 + 40),
            pitchSamples: Array.from({ length: 60 }, () => Math.random() * 50 + 150),
            transcript: "Hello everyone. Um, today I want to talk about the future of AI in education. It's a rapidly evolving field, and like, it has the potential to completely transform how we learn. Uh, traditionally, education has been a one-size-fits-all model. But with AI, we can personalize learning experiences for every single student. You know, imagine a tutor that adapts to your learning style in real time. Um, that's the promise of AI.",
        },
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
                <div className="flex flex-col items-center">
                    <Logo size="sm" />
                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold mt-1">Sample Report</span>
                </div>
                <div className="w-24 border border-primary/20 bg-primary/10 rounded-full px-3 py-1 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary animate-pulse">Demo Mode</span>
                </div>
            </header>

            {/* Report rendered inline */}
            <div className="flex-1 flex items-start justify-center p-4">
                <DetailedSessionReport
                    data={mockReportData as any}
                    onClose={() => router.push("/")}
                />
            </div>
        </div>
    );
}

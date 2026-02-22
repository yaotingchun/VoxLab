"use client";

import useSWR from "swr";
import { StreakCard } from "@/components/ui/StreakCard";
import { ScoreCard } from "@/components/ui/ScoreCard";
import { ProgressChart, ChartDataPoint } from "@/components/ui/ProgressChart";
import { syncStreakFromHistory, StreakData } from "@/lib/streak";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { aggregateSessionsByWeek, getWeeklyChartData } from "@/lib/aggregation";
import { ArchetypeCard } from "@/components/ui/ArchetypeCard";
import { SessionReplay } from "@/components/ui/SessionReplay";
import { calculateArchetype, ArchetypeInsight } from "@/lib/archetypes";
import { analyzeEmotionMatch } from "@/lib/emotionAnalysis";
import { Sparkles, Trophy, Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProgressTrackerPage() {
    const { user, loading: authLoading } = useAuth();

    // SWR fetching
    const { data: apiData, error, isLoading } = useSWR(
        user ? `/api/sessions?userId=${user.uid}` : null,
        fetcher
    );

    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [archetypeData, setArchetypeData] = useState<ArchetypeInsight | null>(null);
    const [chartWeekOffset, setChartWeekOffset] = useState<number>(0);

    // Transforming data for Recharts, grouped actively by the selected 7-day offset
    const currentWeeklyData = useMemo(() => {
        if (!apiData?.sessions || apiData.sessions.length === 0) return { label: "No Data", data: [] };
        return getWeeklyChartData(apiData.sessions, chartWeekOffset);
    }, [apiData, chartWeekOffset]);

    // Compute week-over-week trend calculations between the latest and previous week averages
    const scoreTrends = useMemo(() => {
        if (!apiData?.sessions || apiData.sessions.length === 0) {
            return {
                voice: { score: 0, trend: 0 },
                postureFacial: { score: 0, trend: 0 },
                content: { score: 0, trend: 0 },
                overall: { score: 0, trend: 0 }
            };
        }

        const weeklyStats = aggregateSessionsByWeek(apiData.sessions);
        const latest = weeklyStats[weeklyStats.length - 1];
        const prev = weeklyStats.length > 1 ? weeklyStats[weeklyStats.length - 2] : null;

        const calculateTrend = (current: number, previous: number) => {
            if (!previous) return 0; // First week has 0 trend
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            voice: { score: latest.voice, trend: calculateTrend(latest.voice, prev?.voice || 0) },
            postureFacial: { score: latest.postureFacial, trend: calculateTrend(latest.postureFacial, prev?.postureFacial || 0) },
            content: { score: latest.content, trend: calculateTrend(latest.content, prev?.content || 0) },
            overall: { score: latest.overall, trend: calculateTrend(latest.overall, prev?.overall || 0) }
        };
    }, [apiData]);

    // Compute Emotion Congruence explicitly for the "Inclusivity" Coaching Tip
    const emotionTip = useMemo(() => {
        if (!apiData?.sessions || apiData.sessions.length === 0) return null;
        const latest = apiData.sessions[apiData.sessions.length - 1];

        // Dynamically mock vocal/facial string classifiers based on raw score thresholds
        const vocalStr = latest.vocalScore > 60 ? "energetic and positive" : "nervous";
        const facialStr = latest.facialScore < 60 ? "flat and tense" : "happy and smiling";

        return analyzeEmotionMatch(vocalStr, facialStr);
    }, [apiData]);

    // Sync Streak silently when new valid data loads
    useEffect(() => {
        if (user && apiData?.sessions) {
            const historyDates = apiData.sessions.map((s: any) => s.savedAt);
            syncStreakFromHistory(user.uid, historyDates)
                .then((updatedStreak: StreakData) => setStreakData(updatedStreak))
                .catch(console.error);

            // Trigger archetype calculations asynchronously without blocking UI render
            if (apiData.sessions.length > 0) {
                calculateArchetype(user.uid, apiData.sessions)
                    .then(setArchetypeData)
                    .catch(console.error);
            }
        }
    }, [user, apiData]);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-300 flex flex-col items-center justify-center font-bold">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                <p>Syncing Cloud Data...</p>
            </div>
        );
    }

    if (!user) {
        return <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center font-bold">Please log in to view your progress.</div>;
    }

    if (error) {
        return <div className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center font-bold">Failed to load session history.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-6 lg:px-12 text-slate-200">
            <div className="max-w-7xl mx-auto flex flex-col gap-8">

                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="text-yellow-500" size={32} />
                    <h1 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Performance Analytics Dashboard
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Analytics Area */}
                    <div className="lg:col-span-8 flex flex-col gap-8">

                        {/* 4 Score Cards Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ScoreCard title="Voice" score={scoreTrends.voice.score} trend={scoreTrends.voice.trend} />
                            <ScoreCard title="Posture & Facial" score={scoreTrends.postureFacial.score} trend={scoreTrends.postureFacial.trend} />
                            <ScoreCard title="Content" score={scoreTrends.content.score} trend={scoreTrends.content.trend} />
                            <ScoreCard title="Overall" score={scoreTrends.overall.score} trend={scoreTrends.overall.trend} />
                        </div>

                        {/* Progress Line Chart */}
                        <ProgressChart
                            data={currentWeeklyData.data}
                            title={`Analysis: ${currentWeeklyData.label}`}
                            onPrev={() => setChartWeekOffset(prev => prev - 1)}
                            onNext={() => setChartWeekOffset(prev => prev + 1)}
                            canGoNext={chartWeekOffset < 0}
                        />

                        {/* AI Coaching Tip Text Area */}
                        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full pointer-events-none" />

                            <div className="flex gap-4 items-start relative z-10">
                                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30 shrink-0">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h4 className="text-blue-300 font-bold mb-2">Emotion Congruence Insight</h4>
                                    <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                                        {emotionTip || "Your Posture has improved significantly this month, but your Eye Contact is still inconsistent. Focus on the camera in your next session!"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Session Replay Hub (Time Machine Feature) */}
                        <SessionReplay sessionId={apiData?.sessions?.[apiData.sessions.length - 1]?.id || null} />

                    </div>

                    {/* Sidebar / Streak Component Area */}
                    <div className="lg:col-span-4 flex flex-col gap-8">
                        <StreakCard streakData={streakData} isUpdating={isLoading} />

                        <div className="bg-slate-900/50 border border-slate-700/50 p-6 rounded-2xl mt-4">
                            <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Consistency matters</h4>
                            <p className="text-slate-500 text-sm">Practice daily to build your streak. Studies show users who maintain a 7+ day streak improve speaking confidence 40% faster.</p>
                        </div>

                        <ArchetypeCard archetype={archetypeData} />
                    </div>
                </div>

            </div>
        </div>
    );
}

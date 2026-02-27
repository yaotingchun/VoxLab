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
import { Sparkles, Trophy, Loader2, Lock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

import { PracticeSession } from "@/types/gamification";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Profile Design Tokens (Matching src/app/dashboard/profile/page.tsx)
const GLASS_CARD = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 hover:bg-white/[0.05] transition-all duration-300";

interface ProgressTrackerTabProps {
    sessions?: PracticeSession[];
}

export function ProgressTrackerTab({ sessions: initialSessions }: ProgressTrackerTabProps) {
    const { user } = useAuth();

    // SWR fetching as fallback if no sessions provided via props
    const { data: apiData, error, isLoading: isSwrLoading } = useSWR(
        user && !initialSessions ? `/api/sessions?userId=${user.uid}` : null,
        fetcher
    );

    // Use passed sessions or API data
    const sessions = useMemo(() => {
        const raw = initialSessions || apiData?.sessions || [];

        // Normalize and search chronological order
        return raw.map((s: any) => {
            const dateVal = s.savedAt || (s.createdAt?.toDate ? s.createdAt.toDate() : s.createdAt);
            const normalizedDate = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

            // Sub-score extraction with robust fallbacks for older data
            // We handle 'score' vs 'averageScore' inconsistency
            const score = s.score ?? s.averageScore ?? 0;
            const vocal = s.vocalScore ?? s.vocalSummary?.score ?? score;
            const posture = s.postureScore ?? s.postureSummary?.score ?? score;
            const facial = s.facialScore ?? s.faceMetrics?.eyeContactScore ?? s.faceMetrics?.averageEngagement ?? score;
            const content = s.contentScore ?? (s.aiSummary as any)?.topicAnalysis?.relevanceScore ?? score;

            return {
                ...s,
                savedAt: normalizedDate,
                score: score,
                vocalScore: vocal,
                postureScore: posture,
                facialScore: facial,
                contentScore: content
            };
        }).sort((a: any, b: any) => {
            return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
        });
    }, [initialSessions, apiData]);

    const isLoading = user && !initialSessions && isSwrLoading;

    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [archetypeData, setArchetypeData] = useState<ArchetypeInsight | null>(null);
    const [chartWeekOffset, setChartWeekOffset] = useState<number>(0);

    const [selectedDayData, setSelectedDayData] = useState<ChartDataPoint | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    // Transforming data for Recharts
    const currentWeeklyData = useMemo(() => {
        if (!sessions || sessions.length === 0) return { label: "No Data", data: [] };
        return getWeeklyChartData(sessions, chartWeekOffset);
    }, [sessions, chartWeekOffset]);

    // Trend calculations
    const scoreTrends = useMemo(() => {
        if (!sessions || sessions.length === 0) {
            return {
                voice: { score: 0, trend: 0 },
                postureFacial: { score: 0, trend: 0 },
                content: { score: 0, trend: 0 },
                overall: { score: 0, trend: 0 }
            };
        }

        const weeklyStats = aggregateSessionsByWeek(sessions);
        const latest = weeklyStats[weeklyStats.length - 1];
        const prev = weeklyStats.length > 1 ? weeklyStats[weeklyStats.length - 2] : null;

        const calculateTrend = (current: number, previous: number) => {
            if (!previous) return 0;
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            voice: { score: latest.voice, trend: calculateTrend(latest.voice, prev?.voice || 0) },
            postureFacial: { score: latest.postureFacial, trend: calculateTrend(latest.postureFacial, prev?.postureFacial || 0) },
            content: { score: latest.content, trend: calculateTrend(latest.content, prev?.content || 0) },
            overall: { score: latest.overall, trend: calculateTrend(latest.overall, prev?.overall || 0) }
        };
    }, [sessions]);

    const emotionTip = useMemo(() => {
        if (!sessions || sessions.length === 0) return "LOCKED";
        const latest = sessions[sessions.length - 1];

        if (latest.savedAt || latest.createdAt) {
            const dateVal = latest.savedAt || (latest.createdAt?.toDate ? latest.createdAt.toDate() : latest.createdAt);
            const latestDate = new Date(dateVal);
            const today = new Date();
            const isToday = latestDate.getDate() === today.getDate() &&
                latestDate.getMonth() === today.getMonth() &&
                latestDate.getFullYear() === today.getFullYear();

            if (!isToday) return "LOCKED";
        } else {
            return "LOCKED";
        }

        const vocalScore = latest.vocalScore || (latest.vocalSummary?.score) || 0;
        const facialScore = latest.facialScore || (latest.faceMetrics?.eyeContactScore) || 0;

        const vocalStr = vocalScore > 60 ? "energetic and positive" : "nervous";
        const facialStr = facialScore < 60 ? "flat and tense" : "happy and smiling";

        return analyzeEmotionMatch(vocalStr, facialStr);
    }, [sessions]);

    const availableSessions = useMemo(() => {
        if (selectedDayData && selectedDayData.sessionIds) {
            const mapped = selectedDayData.sessionIds.map((id) => {
                const apiSession = sessions?.find((s: any) => s.id === id);
                return {
                    id,
                    videoUrl: apiSession?.videoUrl || null,
                    jsonUrl: apiSession?.jsonUrl || apiSession?.reportUrl || null,
                    savedAt: apiSession?.savedAt || (apiSession?.createdAt?.toDate ? apiSession.createdAt.toDate() : apiSession?.createdAt) || null
                };
            });
            return mapped.sort((a, b) => {
                const tA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
                const tB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
                return tA - tB;
            });
        }

        if (sessions && sessions.length > 0) {
            const latestSession = sessions[sessions.length - 1];
            const latestDayData = currentWeeklyData?.data?.find(d => d.sessionIds?.includes(latestSession.id as string));

            if (latestDayData && latestDayData.sessionIds) {
                const mapped = latestDayData.sessionIds.map((id) => {
                    const apiSession = sessions?.find((s: any) => s.id === id);
                    return {
                        id,
                        videoUrl: apiSession?.videoUrl || null,
                        jsonUrl: apiSession?.jsonUrl || apiSession?.reportUrl || null,
                        savedAt: apiSession?.savedAt || (apiSession?.createdAt?.toDate ? apiSession.createdAt.toDate() : apiSession?.createdAt) || null
                    };
                });
                return mapped.sort((a, b) => {
                    const tA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
                    const tB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
                    return tA - tB;
                });
            }
            return [{
                id: latestSession.id as string,
                videoUrl: latestSession.videoUrl || null,
                jsonUrl: latestSession.jsonUrl || latestSession.reportUrl || null,
                savedAt: latestSession.savedAt || (latestSession.createdAt?.toDate ? latestSession.createdAt.toDate() : latestSession.createdAt) || null
            }];
        }
        return [];
    }, [selectedDayData, sessions, currentWeeklyData]);

    const activeSession = useMemo(() => {
        if (selectedSessionId) {
            return availableSessions.find(s => s.id === selectedSessionId) || availableSessions[0];
        }
        return availableSessions[0];
    }, [selectedSessionId, availableSessions]);

    useEffect(() => {
        if (user && sessions) {
            const historyDates = sessions.map((s: any) =>
                s.savedAt || (s.createdAt?.toDate ? s.createdAt.toDate().toISOString() : s.createdAt)
            );
            syncStreakFromHistory(user.uid, historyDates)
                .then(setStreakData)
                .catch(console.error);

            if (sessions.length > 0) {
                calculateArchetype(user.uid, sessions)
                    .then(setArchetypeData)
                    .catch(console.error);
            }
        }
    }, [user, sessions]);

    if (isLoading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin text-primary mb-4" size={40} />
                <p className="font-bold">Syncing Analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-20 text-center text-red-400 font-bold bg-red-500/5 rounded-3xl border border-red-500/10">
                Failed to load practice metrics.
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
            {/* Left Column: Metrics & Charts */}
            <div className="lg:col-span-8 flex flex-col gap-6">

                {/* Unified Score Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ScoreCard title="Voice" score={scoreTrends.voice.score} trend={scoreTrends.voice.trend} />
                    <ScoreCard title="Posture & Facial" score={scoreTrends.postureFacial.score} trend={scoreTrends.postureFacial.trend} />
                    <ScoreCard title="Content" score={scoreTrends.content.score} trend={scoreTrends.content.trend} />
                    <ScoreCard title="Overall" score={scoreTrends.overall.score} trend={scoreTrends.overall.trend} />
                </div>

                {/* Main Progress Graph */}
                <ProgressChart
                    data={currentWeeklyData.data}
                    title={`Activity: ${currentWeeklyData.label}`}
                    onPrev={() => setChartWeekOffset(prev => prev - 1)}
                    onNext={() => setChartWeekOffset(prev => prev + 1)}
                    canGoNext={chartWeekOffset < 0}
                    onNodeClick={(point) => {
                        setSelectedDayData(point);
                        setSelectedSessionId(point.sessionIds?.[0] || null);
                    }}
                />

                {/* Replay Section (Enlarged) */}
                <div className="w-full">
                    <SessionReplay
                        sessionId={activeSession?.id || null}
                        videoUrl={activeSession?.videoUrl || null}
                        jsonUrl={activeSession?.jsonUrl || null}
                        availableSessions={availableSessions}
                        onSessionSelect={(id) => setSelectedSessionId(id)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
                        {/* Daily Insight Card */}
                        <div className={`md:col-span-8 p-8 rounded-[2rem] border transition-all duration-500 flex flex-col justify-center relative overflow-hidden group ${emotionTip === 'LOCKED' ? 'bg-white/[0.02] border-white/5' : 'bg-gradient-to-br from-[#1A1525] to-[#120F18] border-white/5 hover:border-purple-500/30 hover:shadow-[0_0_40px_rgba(168,85,247,0.1)]'}`}>
                            {emotionTip !== 'LOCKED' && <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-60" />}
                            <div className="flex items-center gap-4 mb-5 relative z-10">
                                <div className={`p-2.5 rounded-2xl flex items-center justify-center ${emotionTip === 'LOCKED' ? 'bg-white/5 text-slate-500' : 'bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'}`}>
                                    {emotionTip === 'LOCKED' ? <Lock size={20} /> : <Sparkles size={20} />}
                                </div>
                                <h4 className="font-bold text-xs uppercase tracking-[0.15em] text-white/90">AI Coach Insight</h4>
                            </div>
                            <p className="text-[15px] sm:text-base text-slate-300 leading-relaxed font-medium relative z-10 max-w-2xl">
                                {emotionTip === 'LOCKED'
                                    ? "Practice today to unlock personalized AI feedback on your performance."
                                    : emotionTip}
                            </p>
                        </div>

                        {/* Consistency Tip */}
                        <div className={`md:col-span-4 p-8 rounded-[2rem] border border-white/5 bg-[#16141D] hover:bg-[#1A1822] transition-colors duration-500 flex flex-col justify-center relative overflow-hidden group`}>
                            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-[0.15em] mb-4 flex items-center gap-2.5 relative z-10">
                                <TrendingUp className="w-4 h-4 text-purple-400" /> Consistency
                            </h4>
                            <p className="text-[15px] text-slate-300 leading-relaxed font-medium relative z-10">
                                Regular practice builds confidence 40% faster. <br /><span className="text-purple-400 font-bold block mt-2">Keep going!</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                <StreakCard streakData={streakData} isUpdating={isLoading || false} />
                <ArchetypeCard archetype={archetypeData} />

                {/* Call to Action Card */}
                <div className={`p-8 rounded-3xl ${GLASS_CARD} flex flex-col items-center text-center gap-6 relative overflow-hidden group`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10">
                        <Trophy size={40} className="group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-xl font-black text-white tracking-tight">Ready to Level Up?</h4>
                        <p className="text-sm text-gray-500 font-medium px-4 mt-2 leading-relaxed">Push your boundaries. Start a new practice session and beat your personal best.</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black rounded-xl transition-all shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 relative z-10 uppercase tracking-widest text-[11px]"
                    >
                        PRACTICE NOW
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

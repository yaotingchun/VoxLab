"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PracticeSession } from "@/types/gamification";
import { DetailedSessionReport } from "@/components/analysis/DetailedSessionReport";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SessionReportPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const sessionId = params?.sessionId as string;

    const [session, setSession] = useState<PracticeSession | null>(null);
    const [fetching, setFetching] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Auth guard
    useEffect(() => {
        if (!loading && !user) router.push("/");
    }, [user, loading, router]);

    // Fetch session
    useEffect(() => {
        if (!user || !sessionId) return;
        (async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid, "sessions", sessionId));
                if (!snap.exists()) {
                    setNotFound(true);
                } else {
                    setSession({ id: snap.id, ...snap.data() } as PracticeSession);
                }
            } catch (e) {
                console.error(e);
                setNotFound(true);
            } finally {
                setFetching(false);
            }
        })();
    }, [user, sessionId]);

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-blue-300 text-sm animate-pulse">Loading report…</p>
            </div>
        );
    }

    if (notFound || !session) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
                <p className="text-xl font-bold">Session not found.</p>
                <Link href="/dashboard/profile" className="text-blue-400 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to Profile
                </Link>
            </div>
        );
    }

    const reportData = {
        summary: session.aiSummary ?? "No AI summary available for this session.",
        tips: session.tips ?? [],
        score: session.score,
        vocalSummary: session.vocalSummary,
        postureSummary: session.postureSummary,
        videoUrl: session.videoUrl,
        rawMetrics: {
            duration: session.duration ?? 0,
            wpm: session.wpm ?? 0,
            totalWords: session.totalWords ?? 0,
            fillerCounts: session.fillerCounts ?? {},
            pauseCount: session.pauseCount ?? 0,
            wpmHistory: session.wpmHistory ?? [],
            pauseStats: session.pauseStats ?? null,
            audioMetrics: session.audioMetrics
                ? {
                    averageVolume: session.audioMetrics.averageVolume,
                    pitchRange: session.audioMetrics.pitchRange,
                    isMonotone: session.audioMetrics.isMonotone,
                    isTooQuiet: session.audioMetrics.isTooQuiet,
                }
                : undefined,
            // volumeSamples / pitchSamples / words not stored (too large)
            volumeSamples: undefined,
            pitchSamples: undefined,
            transcript: session.transcript ?? "",
        },
    };

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Minimal header */}
            <header className="flex items-center gap-3 p-4 border-b border-slate-800">
                <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Profile
                </Link>
            </header>

            {/* Report rendered inline (not as a modal) */}
            <div className="flex-1 flex items-start justify-center p-4">
                <DetailedSessionReport
                    data={reportData}
                    onClose={() => router.push("/dashboard/profile")}
                />
            </div>
        </div>
    );
}

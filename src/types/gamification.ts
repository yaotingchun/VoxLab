import { Timestamp } from "firebase/firestore";
import { PauseStats } from "@/lib/pause-analysis";

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;           // emoji
    rarity: "common" | "rare" | "epic" | "legendary";
    awardedAt?: Timestamp;
    earned: boolean;
}

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: Badge["rarity"];
    color: string;  // hex color for the icon tile background
    check: (stats: BadgeCheckStats) => boolean;
    progress: (stats: BadgeCheckStats) => { current: number; max: number };
}

export interface BadgeCheckStats {
    sessionsCount: number;
    streakCount: number;
    longestStreak: number;
    averageScore: number;       // latest session score
    postsCount: number;
    likesReceived: number;
    followersCount: number;
    sessionDuration: number;    // seconds, latest session
    totalPracticeSeconds: number;
    bestScore: number;
}

export interface Streak {
    streakCount: number;
    longestStreak: number;
    lastPracticeDate: string;   // ISO date "YYYY-MM-DD"
}

export interface PracticeSession {
    id?: string;
    uid: string;
    createdAt: Timestamp;
    duration: number;           // seconds
    score: number;
    topics: string[];           // issue labels detected
    wpm?: number;
    totalWords?: number;
    aiSummary?: string;
    // Rich report fields (saved from v2 onwards)
    tips?: string[];
    fillerCounts?: Record<string, number>;
    pauseCount?: number;
    wpmHistory?: number[];
    transcript?: string;
    pauseStats?: { stats: PauseStats; feedback: { message: string; type: "good" | "warn" | "bad" } } | null;
    audioMetrics?: { averageVolume: number; pitchRange: number; isMonotone: boolean; isTooQuiet: boolean } | null;
    vocalSummary?: { summary: string; tips: string[]; score?: number } | null;
    postureSummary?: { summary: string; tips: string[]; score?: number; gestureEnergy?: number } | null;
    videoUrl?: string | null;
    issueCounts?: Record<string, number>;
    faceMetrics?: {
        averageEngagement: number;
        smilePercentage: number;
        blinkRateAverage: number;
        eyeContactScore: number;
        hasHighBlinkRate: boolean;
        hasMouthTension: boolean;
        hasShiftyEyes: boolean;
        hasPoorCameraClarity: boolean;
    } | null;
    rubricText?: string | null;
    rubricFeedback?: {
        score: number;
        alignmentLevel: "high" | "medium" | "low";
        overallAssessment: string;
        criteriaBreakdown: {
            criterion: string;
            fulfillment: "full" | "partial" | "none";
            feedback: string;
            evidence: string;
        }[];
    lectureAnalysis?: {
        teachingScore: number;
        clarityFeedback: string;
        potentialConfusion: string[];
        analogies: string[];
    } | null;
}}


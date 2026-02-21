import { Timestamp } from "firebase/firestore";

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
    check: (stats: BadgeCheckStats) => boolean;
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
}

export interface PracticeRoom {
    id?: string;
    hostUid: string;
    hostName: string;
    hostAvatar?: string | null;
    createdAt: Timestamp;
    status: "waiting" | "active" | "ended";
    participants: string[];
}

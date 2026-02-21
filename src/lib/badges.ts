import { db } from "./firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp
} from "firebase/firestore";
import { BadgeDefinition, BadgeCheckStats } from "@/types/gamification";
import { sendNotification } from "./notifications";

// ─── Badge Definitions ────────────────────────────────────────────────────────

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    {
        id: "first_words",
        name: "First Words",
        description: "Complete your very first practice session.",
        icon: "🎤",
        rarity: "common",
        color: "#22c55e",
        check: (s) => s.sessionsCount >= 1,
        progress: (s) => ({ current: Math.min(s.sessionsCount, 1), max: 1 })
    },
    {
        id: "on_a_roll",
        name: "On a Roll",
        description: "Achieve a 3-day practice streak.",
        icon: "🔥",
        rarity: "common",
        color: "#f97316",
        check: (s) => s.streakCount >= 3,
        progress: (s) => ({ current: Math.min(s.streakCount, 3), max: 3 })
    },
    {
        id: "week_warrior",
        name: "Week Warrior",
        description: "Maintain a 7-day practice streak.",
        icon: "📅",
        rarity: "rare",
        color: "#3b82f6",
        check: (s) => s.streakCount >= 7,
        progress: (s) => ({ current: Math.min(s.streakCount, 7), max: 7 })
    },
    {
        id: "month_master",
        name: "Month Master",
        description: "Maintain a 30-day practice streak.",
        icon: "🏆",
        rarity: "legendary",
        color: "#eab308",
        check: (s) => s.streakCount >= 30,
        progress: (s) => ({ current: Math.min(s.streakCount, 30), max: 30 })
    },
    {
        id: "score_star",
        name: "Score Star",
        description: "Achieve a score of 90 or higher in a session.",
        icon: "⭐",
        rarity: "rare",
        color: "#8b5cf6",
        check: (s) => s.bestScore >= 90,
        progress: (s) => ({ current: Math.min(s.bestScore, 90), max: 90 })
    },
    {
        id: "perfect_ten",
        name: "Perfect Ten",
        description: "Score 100 in a practice session.",
        icon: "💯",
        rarity: "legendary",
        color: "#ec4899",
        check: (s) => s.bestScore >= 100,
        progress: (s) => ({ current: Math.min(s.bestScore, 100), max: 100 })
    },
    {
        id: "chatterbox",
        name: "Chatterbox",
        description: "Post 5 threads in the forum.",
        icon: "💬",
        rarity: "common",
        color: "#06b6d4",
        check: (s) => s.postsCount >= 5,
        progress: (s) => ({ current: Math.min(s.postsCount, 5), max: 5 })
    },
    {
        id: "popular",
        name: "Popular",
        description: "Receive 10 likes on your posts.",
        icon: "❤️",
        rarity: "rare",
        color: "#ef4444",
        check: (s) => s.likesReceived >= 10,
        progress: (s) => ({ current: Math.min(s.likesReceived, 10), max: 10 })
    },
    {
        id: "social_butterfly",
        name: "Social Butterfly",
        description: "Gain 5 followers.",
        icon: "👥",
        rarity: "rare",
        color: "#14b8a6",
        check: (s) => s.followersCount >= 5,
        progress: (s) => ({ current: Math.min(s.followersCount, 5), max: 5 })
    },
    {
        id: "influencer",
        name: "Influencer",
        description: "Gain 25 followers.",
        icon: "🌟",
        rarity: "epic",
        color: "#a855f7",
        check: (s) => s.followersCount >= 25,
        progress: (s) => ({ current: Math.min(s.followersCount, 25), max: 25 })
    },
    {
        id: "speed_demon",
        name: "Speed Demon",
        description: "Complete a session lasting 10+ minutes.",
        icon: "⚡",
        rarity: "common",
        color: "#f59e0b",
        check: (s) => s.sessionDuration >= 600,
        progress: (s) => ({ current: Math.min(s.sessionDuration, 600), max: 600 })
    },
    {
        id: "marathon_speaker",
        name: "Marathon Speaker",
        description: "Accumulate 5+ hours of total practice time.",
        icon: "🏃",
        rarity: "epic",
        color: "#10b981",
        check: (s) => s.totalPracticeSeconds >= 18000,
        progress: (s) => ({ current: Math.min(Math.round(s.totalPracticeSeconds / 60), 300), max: 300 })
    },
    {
        id: "veteran",
        name: "Veteran",
        description: "Complete 50 practice sessions.",
        icon: "🎖️",
        rarity: "epic",
        color: "#6366f1",
        check: (s) => s.sessionsCount >= 50,
        progress: (s) => ({ current: Math.min(s.sessionsCount, 50), max: 50 })
    }
];

// ─── Award Logic ──────────────────────────────────────────────────────────────

/**
 * Check all badge criteria against current user stats and award any newly earned badges.
 * Returns array of newly awarded badge IDs.
 */
export const checkAndAwardBadges = async (
    uid: string,
    stats: BadgeCheckStats
): Promise<string[]> => {
    const badgesRef = collection(db, "users", uid, "badges");
    const existingSnap = await getDocs(badgesRef);
    const earnedIds = new Set(existingSnap.docs.map(d => d.id));

    const newlyAwarded: string[] = [];

    for (const def of BADGE_DEFINITIONS) {
        if (earnedIds.has(def.id)) continue;
        if (def.check(stats)) {
            await setDoc(doc(db, "users", uid, "badges", def.id), {
                id: def.id,
                name: def.name,
                description: def.description,
                icon: def.icon,
                rarity: def.rarity,
                awardedAt: serverTimestamp()
            });

            // Self-notification for badge award
            await sendNotification({
                recipientId: uid,
                type: "system",
                message: `🏅 You earned the "${def.name}" badge! ${def.icon}`,
                link: "/dashboard/profile"
            });

            newlyAwarded.push(def.id);
        }
    }

    return newlyAwarded;
};

/**
 * Fetch all badges for a user, merging definitions with earned status.
 */
export const getUserBadges = async (uid: string) => {
    const snap = await getDocs(collection(db, "users", uid, "badges"));
    const earned = new Map(snap.docs.map(d => [d.id, d.data()]));

    return BADGE_DEFINITIONS.map(def => ({
        ...def,
        earned: earned.has(def.id),
        awardedAt: earned.get(def.id)?.awardedAt ?? null
    }));
};

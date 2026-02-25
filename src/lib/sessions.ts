import { db } from "./firebase";
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    getDoc,
    doc,
    runTransaction,
    serverTimestamp
} from "firebase/firestore";
import { PracticeSession } from "@/types/gamification";
import { getLocalDateString } from "./streak";

/**
 * Save a completed session to Firestore under users/{uid}/sessions
 * Uses a Firestore Transaction to atomically increment currentStreak 
 * and attach the session into history to prevent sync issues.
 */
export const saveSession = async (
    uid: string,
    data: Omit<PracticeSession, "id" | "uid" | "createdAt">
): Promise<string> => {

    // We create a new doc ref manually so we know its ID during the transaction
    const sessionsCol = collection(db, "users", uid, "sessions");
    const newSessionRef = doc(sessionsCol);
    const userRef = doc(db, "users", uid);

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);

        let currentStreak = 0;
        let longestStreak = 0;
        let practiceHistory: string[] = [];

        if (userDoc.exists()) {
            const ud = userDoc.data();
            currentStreak = ud.currentStreak || 0;
            longestStreak = ud.longestStreak || 0;
            practiceHistory = ud.practiceHistory || [];
        }

        const todayStr = getLocalDateString(new Date());
        let updatedStreak = currentStreak;

        if (practiceHistory.length === 0 || practiceHistory[0] !== todayStr) {
            // New day practice
            updatedStreak += 1;

            // Insert today at the beginning
            if (practiceHistory[0] !== todayStr) {
                practiceHistory.unshift(todayStr);
            }
        }

        if (updatedStreak > longestStreak) {
            longestStreak = updatedStreak;
        }

        // 1. Write the streak data
        transaction.set(userRef, {
            currentStreak: updatedStreak,
            longestStreak,
            practiceHistory,
            lastPracticeDate: todayStr
        }, { merge: true });

        // 2. Write the session document atomically
        transaction.set(newSessionRef, {
            uid,
            ...data,
            createdAt: serverTimestamp()
        });
    });

    return newSessionRef.id;
};

/**
 * Get recent sessions for a user, ordered by most recent first.
 */
export const getRecentSessions = async (uid: string, count = 100): Promise<PracticeSession[]> => {
    const q = query(
        collection(db, "users", uid, "sessions"),
        orderBy("createdAt", "desc"),
        limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PracticeSession));
};

/**
 * Get aggregate session stats needed for badge checks.
 */
export const getSessionStats = async (uid: string): Promise<{
    sessionsCount: number;
    totalPracticeSeconds: number;
    bestScore: number;
}> => {
    const userSnap = await getDoc(doc(db, "users", uid));
    const userData = userSnap.exists() ? userSnap.data() : {};

    // Count sessions
    const sessionsSnap = await getDocs(collection(db, "users", uid, "sessions"));
    let totalSeconds = 0;
    let bestScore = 0;

    sessionsSnap.docs.forEach(d => {
        const s = d.data();
        totalSeconds += s.duration ?? 0;
        if ((s.score ?? 0) > bestScore) bestScore = s.score;
    });

    return {
        sessionsCount: sessionsSnap.size,
        totalPracticeSeconds: totalSeconds,
        bestScore
    };
};

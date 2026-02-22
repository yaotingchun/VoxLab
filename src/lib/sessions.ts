import { db } from "./firebase";
import {
    collection,
    addDoc,
    getDocs,
    serverTimestamp,
    query,
    orderBy,
    limit,
    getDoc,
    doc
} from "firebase/firestore";
import { PracticeSession } from "@/types/gamification";

/**
 * Save a completed session to Firestore under users/{uid}/sessions
 */
export const saveSession = async (
    uid: string,
    data: Omit<PracticeSession, "id" | "uid" | "createdAt">
): Promise<string> => {
    const ref = await addDoc(collection(db, "users", uid, "sessions"), {
        uid,
        ...data,
        createdAt: serverTimestamp()
    });
    return ref.id;
};

/**
 * Get recent sessions for a user, ordered by most recent first.
 */
export const getRecentSessions = async (uid: string, count = 20): Promise<PracticeSession[]> => {
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

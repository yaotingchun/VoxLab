import { db } from "./firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

const toDateString = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Update the user's daily practice streak.
 * Returns the new streak count.
 */
export const updateStreak = async (uid: string): Promise<number> => {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    const today = toDateString(new Date());
    const data = snap.exists() ? snap.data() : {};

    const lastDate: string | undefined = data?.lastPracticeDate;
    const current: number = data?.streakCount ?? 0;
    const longest: number = data?.longestStreak ?? 0;

    let newStreak = 1;

    if (lastDate) {
        const last = new Date(lastDate);
        const todayDate = new Date(today);
        const diffDays = Math.round((todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            // Already practiced today — no change
            return current;
        } else if (diffDays === 1) {
            // Consecutive day — extend streak
            newStreak = current + 1;
        }
        // else gap > 1 → reset to 1
    }

    const newLongest = Math.max(longest, newStreak);

    await setDoc(userRef, {
        streakCount: newStreak,
        longestStreak: newLongest,
        lastPracticeDate: today,
        "stats.sessionsCount": (data?.stats?.sessionsCount ?? 0) + 1
    }, { merge: true });

    return newStreak;
};

export const getStreak = async (uid: string): Promise<{ streakCount: number; longestStreak: number; lastPracticeDate: string | null }> => {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { streakCount: 0, longestStreak: 0, lastPracticeDate: null };
    const data = snap.data();
    return {
        streakCount: data.streakCount ?? 0,
        longestStreak: data.longestStreak ?? 0,
        lastPracticeDate: data.lastPracticeDate ?? null
    };
};

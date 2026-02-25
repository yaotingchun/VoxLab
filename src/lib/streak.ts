import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastPracticeDate: string; // ISO format: YYYY-MM-DD
    practiceHistory: string[]; // Array of ISO string dates
}

// Helper to get today's date string in YYYY-MM-DD format (local timezone)
export function getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function getUserStreak(userId: string): Promise<StreakData | null> {
    if (!userId) return null;

    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                currentStreak: data.currentStreak || 0,
                longestStreak: data.longestStreak || 0,
                lastPracticeDate: data.lastPracticeDate || "",
                practiceHistory: data.practiceHistory || [],
            };
        } else {
            return {
                currentStreak: 0,
                longestStreak: 0,
                lastPracticeDate: "",
                practiceHistory: [],
            };
        }
    } catch (error) {
        console.error("Error fetching user streak:", error);
        return null;
    }
}

/**
 * Calculates and updates streak based on an array of raw dates (e.g., from GCS sessions)
 * It sorts the dates, finds the consecutive streak leading up to today or yesterday,
 * and syncs it back to Firestore.
 */
export async function syncStreakFromHistory(userId: string, rawDates: string[]): Promise<StreakData> {
    if (!userId) throw new Error("User ID is required");

    // Convert to YYYY-MM-DD and remove duplicates
    const uniqueHistory = Array.from(new Set(rawDates.map(d => getLocalDateString(new Date(d)))));

    // Sort descending (newest first)
    uniqueHistory.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let calculatedStreak = 0;
    const todayStr = getLocalDateString(new Date());

    // Calculate Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (uniqueHistory.length > 0) {
        const mostRecent = uniqueHistory[0];

        // If the user hasn't practiced today or yesterday, streak is broken
        if (mostRecent === todayStr || mostRecent === yesterdayStr) {
            calculatedStreak = 1;

            // Start checking consecutively backwards
            let currentDateCheck = new Date(mostRecent);
            for (let i = 1; i < uniqueHistory.length; i++) {
                currentDateCheck.setDate(currentDateCheck.getDate() - 1);
                const expectedPreviousStr = getLocalDateString(currentDateCheck);

                if (uniqueHistory[i] === expectedPreviousStr) {
                    calculatedStreak++;
                } else {
                    break; // Streak broken
                }
            }
        }
    }

    // Also calculate the absolute longest streak ever achieved in the `uniqueHistory`
    let maxHistoricalStreak = 0;
    if (uniqueHistory.length > 0) {
        let currentRun = 1;
        maxHistoricalStreak = 1;
        for (let i = 0; i < uniqueHistory.length - 1; i++) {
            const currDate = new Date(uniqueHistory[i]);
            const nextDate = new Date(uniqueHistory[i + 1]);
            // If they are exactly 1 day apart, streak continues
            const diffDays = Math.round((currDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                currentRun++;
                maxHistoricalStreak = Math.max(maxHistoricalStreak, currentRun);
            } else {
                currentRun = 1; // broken streak
            }
        }
    }

    // Safety check against existing firestore data so we never shrink longestStreak
    let firestoreLongest = 0;
    try {
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists()) {
            firestoreLongest = docSnap.data().longestStreak || 0;
        }
    } catch (e) { }

    const finalLongestStreak = Math.max(maxHistoricalStreak, calculatedStreak, firestoreLongest);

    const freshData: StreakData = {
        currentStreak: calculatedStreak,
        longestStreak: finalLongestStreak,
        lastPracticeDate: uniqueHistory.length > 0 ? uniqueHistory[0] : "",
        practiceHistory: uniqueHistory, // Entire normalized history for the UI grid
    };

    try {
        // Sync to Firebase
        const docRef = doc(db, "users", userId);
        await setDoc(docRef, freshData, { merge: true });
        return freshData;
    } catch (error) {
        console.error("Error updating synced streak:", error);
        throw error;
    }
}

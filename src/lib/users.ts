import { db } from "./firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
} from "firebase/firestore";
import { UserProfile } from "@/types/forum";

/**
 * Search users by username prefix OR exact UID.
 * - If query is 28+ chars (Firebase UID length), try getDoc by UID first.
 * - Otherwise, prefix-search on the `username` field (lowercase).
 */
export async function searchUsers(q: string): Promise<UserProfile[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];

    // Strip leading @ if present
    const clean = trimmed.startsWith("@") ? trimmed.slice(1).toLowerCase() : trimmed.toLowerCase();

    // Looks like a UID (20-28 chars, alphanumeric)? Try direct lookup first.
    if (trimmed.length >= 20 && /^[a-zA-Z0-9]+$/.test(trimmed)) {
        const snap = await getDoc(doc(db, "users", trimmed));
        if (snap.exists()) return [{ uid: snap.id, ...snap.data() } as UserProfile];
    }

    // Username prefix search
    const usersRef = collection(db, "users");
    const snap = await getDocs(
        query(
            usersRef,
            where("username", ">=", clean),
            where("username", "<=", clean + "\uf8ff"),
            orderBy("username"),
            limit(10)
        )
    );

    return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
}

/**
 * Check if a username is already taken by another user.
 */
export async function isUsernameTaken(username: string, currentUid: string): Promise<boolean> {
    const snap = await getDocs(
        query(collection(db, "users"), where("username", "==", username.toLowerCase()), limit(1))
    );
    if (snap.empty) return false;
    // Allow if the only match is the current user themselves
    return snap.docs[0].id !== currentUid;
}

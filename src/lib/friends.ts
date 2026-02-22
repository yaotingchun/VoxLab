import { db } from "./firebase";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    where
} from "firebase/firestore";
import { getFollowers, getFollowing } from "./follow";

/**
 * Friends = mutual follows (A follows B AND B follows A).
 */
export const getFriends = async (uid: string) => {
    const [followers, following] = await Promise.all([
        getFollowers(uid),
        getFollowing(uid)
    ]);

    const followerIds = new Set(followers.map(f => f.uid));
    return following.filter(f => followerIds.has(f.uid));
};

// ─── Practice Room Invites ────────────────────────────────────────────────────
// TODO: Practice room invite feature is reserved for future implementation.

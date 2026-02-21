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

export interface PracticeRoomInvite {
    id?: string;
    fromUid: string;
    fromName: string;
    fromAvatar?: string | null;
    roomId: string;
    createdAt?: any;
}

/**
 * Create a practice room and invite a friend.
 * Returns the roomId.
 */
export const inviteFriendToPractice = async (
    hostUid: string,
    hostName: string,
    hostAvatar: string | null,
    friendUid: string
): Promise<string> => {
    // Create the room
    const roomRef = await addDoc(collection(db, "practiceRooms"), {
        hostUid,
        hostName,
        hostAvatar: hostAvatar || null,
        createdAt: serverTimestamp(),
        status: "waiting",
        participants: [hostUid]
    });

    // Send invite notification via Firestore subcollection
    await addDoc(collection(db, "users", friendUid, "notifications"), {
        type: "system",
        message: `${hostName} invited you to a practice room! 🎤`,
        link: `/dashboard/practice/room/${roomRef.id}`,
        read: false,
        createdAt: serverTimestamp(),
        sender: {
            id: hostUid,
            name: hostName,
            avatar: hostAvatar || null
        }
    });

    return roomRef.id;
};

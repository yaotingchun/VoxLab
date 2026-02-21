import {
    doc,
    setDoc,
    deleteDoc,
    getDoc,
    collection,
    getDocs,
    increment,
    serverTimestamp,
    updateDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { sendNotification } from "./notifications";

export interface FollowEntry {
    uid: string;
    displayName: string;
    photoURL: string | null;
    followedAt: Date;
}

/**
 * Follow a user. Updates both users' subcollections and increments counts.
 */
export const followUser = async (
    currentUser: { uid: string; displayName: string | null; photoURL: string | null },
    targetUid: string,
    targetDisplayName: string,
    targetPhotoURL: string | null
) => {
    if (currentUser.uid === targetUid) return;

    const now = serverTimestamp();

    // Add to current user's "following" subcollection
    await setDoc(doc(db, "users", currentUser.uid, "following", targetUid), {
        uid: targetUid,
        displayName: targetDisplayName,
        photoURL: targetPhotoURL || null,
        followedAt: now
    });

    // Add to target user's "followers" subcollection
    await setDoc(doc(db, "users", targetUid, "followers", currentUser.uid), {
        uid: currentUser.uid,
        displayName: currentUser.displayName || "Anonymous",
        photoURL: currentUser.photoURL || null,
        followedAt: now
    });

    // Increment counts on both user docs
    await updateDoc(doc(db, "users", currentUser.uid), { followingCount: increment(1) }).catch(async () => {
        // doc might not exist yet, create it
        await setDoc(doc(db, "users", currentUser.uid), { followingCount: 1 }, { merge: true });
    });
    await updateDoc(doc(db, "users", targetUid), { followersCount: increment(1) }).catch(async () => {
        await setDoc(doc(db, "users", targetUid), { followersCount: 1 }, { merge: true });
    });

    // Send notification to target
    await sendNotification({
        recipientId: targetUid,
        type: "follow",
        message: `${currentUser.displayName || "Someone"} started following you`,
        link: `/dashboard/profile/${currentUser.uid}`,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Anonymous",
        senderAvatar: currentUser.photoURL || undefined
    });
};

/**
 * Unfollow a user.
 */
export const unfollowUser = async (currentUid: string, targetUid: string) => {
    await deleteDoc(doc(db, "users", currentUid, "following", targetUid));
    await deleteDoc(doc(db, "users", targetUid, "followers", currentUid));

    await updateDoc(doc(db, "users", currentUid), { followingCount: increment(-1) }).catch(() => { });
    await updateDoc(doc(db, "users", targetUid), { followersCount: increment(-1) }).catch(() => { });
};

/**
 * Check if currentUid is following targetUid.
 */
export const checkIsFollowing = async (currentUid: string, targetUid: string): Promise<boolean> => {
    const snap = await getDoc(doc(db, "users", currentUid, "following", targetUid));
    return snap.exists();
};

/**
 * Get the list of followers for a user.
 */
export const getFollowers = async (uid: string): Promise<FollowEntry[]> => {
    const snap = await getDocs(collection(db, "users", uid, "followers"));
    return snap.docs.map(d => {
        const data = d.data();
        return {
            uid: data.uid,
            displayName: data.displayName,
            photoURL: data.photoURL,
            followedAt: data.followedAt?.toDate?.() ?? new Date()
        };
    });
};

/**
 * Get the list of users that a user is following.
 */
export const getFollowing = async (uid: string): Promise<FollowEntry[]> => {
    const snap = await getDocs(collection(db, "users", uid, "following"));
    return snap.docs.map(d => {
        const data = d.data();
        return {
            uid: data.uid,
            displayName: data.displayName,
            photoURL: data.photoURL,
            followedAt: data.followedAt?.toDate?.() ?? new Date()
        };
    });
};

/**
 * Get follower and following counts from the user doc.
 */
export const getFollowCounts = async (uid: string): Promise<{ followersCount: number; followingCount: number }> => {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
        const data = snap.data();
        return {
            followersCount: data.followersCount ?? 0,
            followingCount: data.followingCount ?? 0
        };
    }
    return { followersCount: 0, followingCount: 0 };
};

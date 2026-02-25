"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
    followUser as followUserHelper,
    unfollowUser as unfollowUserHelper,
    checkIsFollowing,
    getFollowers,
    getFollowing,
    getFollowCounts,
    FollowEntry
} from "@/lib/follow";
import { useAuth } from "./AuthContext";

interface FollowContextType {
    // For the logged-in user's own profile
    followersCount: number;
    followingCount: number;
    followers: FollowEntry[];
    following: FollowEntry[];
    loadMyFollowData: () => Promise<void>;

    // For interacting with any user
    followUser: (targetUid: string, targetDisplayName: string, targetPhotoURL: string | null) => Promise<void>;
    unfollowUser: (targetUid: string) => Promise<void>;
    isFollowing: (targetUid: string) => Promise<boolean>;
    getFollowCountsFor: (uid: string) => Promise<{ followersCount: number; followingCount: number }>;
    getFollowersFor: (uid: string) => Promise<FollowEntry[]>;
    getFollowingFor: (uid: string) => Promise<FollowEntry[]>;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const FollowProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followers, setFollowers] = useState<FollowEntry[]>([]);
    const [following, setFollowing] = useState<FollowEntry[]>([]);

    const loadMyFollowData = useCallback(async () => {
        if (!user) return;
        const [counts, followerList, followingList] = await Promise.all([
            getFollowCounts(user.uid),
            getFollowers(user.uid),
            getFollowing(user.uid)
        ]);
        setFollowersCount(followerList.length);
        setFollowingCount(followingList.length);
        setFollowers(followerList);
        setFollowing(followingList);
    }, [user]);

    const followUser = useCallback(async (targetUid: string, targetDisplayName: string, targetPhotoURL: string | null) => {
        if (!user) throw new Error("Must be logged in to follow");
        await followUserHelper(
            { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL },
            targetUid,
            targetDisplayName,
            targetPhotoURL
        );
        setFollowingCount(c => c + 1);
    }, [user]);

    const unfollowUser = useCallback(async (targetUid: string) => {
        if (!user) throw new Error("Must be logged in to unfollow");
        await unfollowUserHelper(user.uid, targetUid);
        setFollowingCount(c => Math.max(0, c - 1));
    }, [user]);

    const isFollowing = useCallback(async (targetUid: string): Promise<boolean> => {
        if (!user) return false;
        return checkIsFollowing(user.uid, targetUid);
    }, [user]);

    const getFollowCountsFor = useCallback((uid: string) => getFollowCounts(uid), []);
    const getFollowersFor = useCallback((uid: string) => getFollowers(uid), []);
    const getFollowingFor = useCallback((uid: string) => getFollowing(uid), []);

    return (
        <FollowContext.Provider value={{
            followersCount,
            followingCount,
            followers,
            following,
            loadMyFollowData,
            followUser,
            unfollowUser,
            isFollowing,
            getFollowCountsFor,
            getFollowersFor,
            getFollowingFor
        }}>
            {children}
        </FollowContext.Provider>
    );
};

export const useFollow = () => {
    const context = useContext(FollowContext);
    if (!context) throw new Error("useFollow must be used within a FollowProvider");
    return context;
};

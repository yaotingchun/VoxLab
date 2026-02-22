"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/forum';

export function useUserProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }

        const userRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);

                // Keep Firestore in sync with the latest Firebase Auth profile data.
                // This fixes stale/missing displayName and photoURL shown on public profiles.
                if (user.displayName || user.photoURL) {
                    updateDoc(userRef, {
                        ...(user.displayName && { displayName: user.displayName }),
                        ...(user.photoURL && { photoURL: user.photoURL }),
                    }).catch(err => console.error("Error syncing profile:", err));
                }
            } else {
                // Create profile if not exists
                const newProfile: UserProfile = {
                    uid: user.uid,
                    displayName: user.displayName || 'Anonymous',
                    photoURL: user.photoURL || '',
                    role: 'user',
                    stats: {
                        postsCount: 0,
                        commentsCount: 0,
                        likesReceived: 0,
                        bestAnswersCount: 0
                    },
                    followersCount: 0,
                    followingCount: 0,
                    lastActiveAt: serverTimestamp() as any, // Typed as any to avoid client/server timestamp mismatch issues initially
                    isOnline: true
                };

                await setDoc(userRef, newProfile);
                setProfile(newProfile);
            }
            setLoading(false);
        });

        // Update active status on mount
        updateDoc(userRef, {
            lastActiveAt: serverTimestamp(),
            isOnline: true
        }).catch(err => console.error("Error updating presence:", err));

        return () => unsubscribe();
    }, [user]);

    return { profile, loading };
}

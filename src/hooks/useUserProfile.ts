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

                // Update lastActiveAt periodically (e.g., every 5 minutes if we wanted, but here we just update on session start/snapshot for now)
                // For "Online" status, we might want a separate presence system or just update this timestamp more frequently.
                // For now, let's update it when the hook mounts/auth changes.
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

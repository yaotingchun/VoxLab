"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/forum';

export interface UpdateProfileFields {
    displayName?: string;
    photoURL?: string;
    bio?: string;
    username?: string;
}

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
                if (user.displayName || user.photoURL) {
                    updateDoc(userRef, {
                        ...(user.displayName && { displayName: user.displayName }),
                        ...(user.photoURL && { photoURL: user.photoURL }),
                    }).catch(err => console.error("Error syncing profile:", err));
                }
            } else {
                // Create profile if it doesn't exist yet
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
                    lastActiveAt: serverTimestamp() as any,
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

    /** Update editable profile fields in Firestore (and Firebase Auth where applicable). */
    const updateProfile = async (fields: UpdateProfileFields) => {
        if (!user) throw new Error("Not authenticated");
        const userRef = doc(db, 'users', user.uid);

        const toSave = {
            ...fields,
            // Always store username lowercased
            ...(fields.username !== undefined && { username: fields.username.toLowerCase() }),
        };

        await updateDoc(userRef, toSave);

        // Keep Firebase Auth displayName / photoURL in sync
        const authUpdates: { displayName?: string; photoURL?: string } = {};
        if (fields.displayName) authUpdates.displayName = fields.displayName;
        if (fields.photoURL) authUpdates.photoURL = fields.photoURL;
        if (Object.keys(authUpdates).length > 0) {
            await updateFirebaseAuthProfile(user, authUpdates);
        }
    };

    return { profile, loading, updateProfile };
}

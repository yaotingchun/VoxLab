"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, ExternalLink, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/contexts/FollowContext";

interface ForumAuthorHoverProps {
    authorId: string;
    authorName: string;
    authorAvatar?: string | null;
    children: React.ReactNode;
}

interface AuthorProfile {
    displayName: string;
    photoURL: string | null;
    followersCount: number;
    stats?: {
        postsCount?: number;
        commentsCount?: number;
    };
}

export const ForumAuthorHover: React.FC<ForumAuthorHoverProps> = ({
    authorId,
    authorName,
    authorAvatar,
    children
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [profile, setProfile] = useState<AuthorProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoverRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user } = useAuth();
    const { followUser, unfollowUser, isFollowing } = useFollow();

    const fetchProfile = async () => {
        if (profile || loading) return;
        setLoading(true);
        try {
            const [snap, followingStatus] = await Promise.all([
                getDoc(doc(db, "users", authorId)),
                isFollowing(authorId)
            ]);
            setIsFollowingAuthor(followingStatus);
            if (snap.exists()) {
                const data = snap.data();
                setProfile({
                    displayName: data.displayName || authorName,
                    photoURL: data.photoURL || null,
                    followersCount: data.followersCount ?? 0,
                    stats: data.stats ?? {}
                });
            } else {
                setProfile({
                    displayName: authorName,
                    photoURL: authorAvatar ?? null,
                    followersCount: 0,
                    stats: {}
                });
            }
        } catch {
            setProfile({
                displayName: authorName,
                photoURL: authorAvatar ?? null,
                followersCount: 0,
                stats: {}
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || followLoading) return;

        setFollowLoading(true);
        try {
            if (isFollowingAuthor) {
                await unfollowUser(authorId);
                setIsFollowingAuthor(false);
                if (profile) setProfile(prev => prev ? { ...prev, followersCount: Math.max(0, prev.followersCount - 1) } : null);
            } else {
                await followUser(authorId, profile?.displayName || authorName, profile?.photoURL || authorAvatar || null);
                setIsFollowingAuthor(true);
                if (profile) setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
            }
        } catch (error) {
            console.error("Follow action failed:", error);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsOpen(true);
            fetchProfile();
        }, 400);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div
            ref={hoverRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {isOpen && (
                <div
                    className="absolute left-0 top-full mt-2 z-50 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={profile?.photoURL || authorAvatar || ""} alt={authorName} />
                            <AvatarFallback className="bg-white/5">
                                <User className="w-5 h-5 text-gray-400" />
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm text-white">
                                {profile?.displayName || authorName}
                            </p>
                            <p className="text-xs text-gray-500">VoxLab Member</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                        </div>
                    ) : profile ? (
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                            <div>
                                <p className="text-sm font-bold text-white">{profile.followersCount}</p>
                                <p className="text-[10px] text-gray-500">Followers</p>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{profile.stats?.postsCount ?? 0}</p>
                                <p className="text-[10px] text-gray-500">Posts</p>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{profile.stats?.commentsCount ?? 0}</p>
                                <p className="text-[10px] text-gray-500">Comments</p>
                            </div>
                        </div>
                    ) : null}

                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/dashboard/profile/${authorId}`); }}
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white transition-colors mb-2"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Profile
                    </button>

                    {user && user.uid !== authorId && (
                        <button
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-bold transition-all ${isFollowingAuthor
                                    ? "bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                                    : "bg-primary/20 text-primary hover:bg-primary/30"
                                }`}
                        >
                            {followLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isFollowingAuthor ? (
                                <><UserMinus className="w-3.5 h-3.5" /> Unfollow</>
                            ) : (
                                <><UserPlus className="w-3.5 h-3.5" /> Follow</>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

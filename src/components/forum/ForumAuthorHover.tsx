"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/contexts/FollowContext";
import { getUserBadges } from "@/lib/badges";
import { UserPlus, UserCheck, ExternalLink, User } from "lucide-react";

interface ForumAuthorHoverProps {
    authorId: string;
    authorName: string;
    authorAvatar?: string | null;
    /** The trigger element (avatar/name) to wrap */
    children: React.ReactNode;
}

/**
 * Wraps any forum author element with a hover card that shows a mini profile
 * and a Follow / Unfollow button.
 */
export function ForumAuthorHover({
    authorId,
    authorName,
    authorAvatar,
    children
}: ForumAuthorHoverProps) {
    const { user } = useAuth();
    const { followUser, unfollowUser, isFollowing: checkIsFollowing } = useFollow();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [following, setFollowing] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [earnedBadges, setEarnedBadges] = useState<{ id: string; icon: string; name: string }[]>([]);
    const [badgesLoaded, setBadgesLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isOwnProfile = user?.uid === authorId;

    // Lazy-load follow status + badges when card opens
    useEffect(() => {
        if (!open) return;
        if (!user || isOwnProfile || following !== null) return;
        checkIsFollowing(authorId).then(setFollowing);
    }, [open, user, isOwnProfile, authorId, checkIsFollowing, following]);

    useEffect(() => {
        if (!open || badgesLoaded) return;
        getUserBadges(authorId).then(badges => {
            setEarnedBadges(badges.filter(b => b.earned).slice(0, 6).map(b => ({ id: b.id, icon: b.icon, name: b.name })));
            setBadgesLoaded(true);
        }).catch(() => setBadgesLoaded(true));
    }, [open, authorId, badgesLoaded]);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setOpen(true), 300);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setOpen(false), 200);
    };

    const handleFollow = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!user || loading) return;
        setLoading(true);
        try {
            if (following) {
                await unfollowUser(authorId);
                setFollowing(false);
            } else {
                await followUser(authorId, authorName, authorAvatar ?? null);
                setFollowing(true);
            }
        } finally {
            setLoading(false);
        }
    }, [user, loading, following, authorId, authorName, authorAvatar, followUser, unfollowUser]);

    const handleViewProfile = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        router.push(`/dashboard/profile/${authorId}`);
    };

    return (
        <div
            ref={containerRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Trigger */}
            {children}

            {/* Hover Card */}
            {open && (
                <div
                    className="absolute left-0 top-full mt-2 z-50 w-60 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 p-4 animate-in fade-in zoom-in-95 duration-150"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Arrow */}
                    <div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#1a1a1a] border-l border-t border-white/10 rotate-45" />

                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-3">
                        {authorAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={authorAvatar} alt={authorName} className="w-10 h-10 rounded-full ring-1 ring-white/10 object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-gray-400" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{authorName}</p>
                            <p className="text-xs text-gray-500">Community Member</p>
                        </div>
                    </div>

                    {/* Badges Row */}
                    {badgesLoaded && earnedBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-white/5">
                            {earnedBadges.map(b => (
                                <span
                                    key={b.id}
                                    title={b.name}
                                    className="text-base leading-none w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    {b.icon}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        {/* View Profile */}
                        <button
                            onClick={handleViewProfile}
                            className="w-full flex items-center justify-center gap-2 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Profile
                        </button>

                        {/* Follow / Unfollow — only show for other users */}
                        {user && !isOwnProfile && (
                            <button
                                onClick={handleFollow}
                                disabled={loading || following === null}
                                className={`w-full flex items-center justify-center gap-2 text-xs font-semibold rounded-lg px-3 py-2 transition-all ${following
                                    ? "bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400"
                                    : "bg-primary hover:bg-primary/80 text-primary-foreground"
                                    } disabled:opacity-50`}
                            >
                                {following ? (
                                    <><UserCheck className="w-3.5 h-3.5" />Following</>
                                ) : (
                                    <><UserPlus className="w-3.5 h-3.5" />Follow</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/contexts/FollowContext";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserPlus, UserMinus, ArrowLeft, X } from "lucide-react";
import { FollowEntry } from "@/lib/follow";

interface PublicProfile {
    uid: string;
    displayName: string;
    photoURL: string | null;
    followersCount: number;
    followingCount: number;
    stats?: {
        postsCount?: number;
        commentsCount?: number;
    };
}

type ModalType = "followers" | "following" | null;

function FollowListModal({
    title,
    list,
    onClose,
    onNavigate
}: {
    title: string;
    list: FollowEntry[];
    onClose: () => void;
    onNavigate: (uid: string) => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-card border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-accent transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {list.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No users here yet.</p>
                    ) : (
                        list.map((entry) => (
                            <button
                                key={entry.uid}
                                onClick={() => { onNavigate(entry.uid); onClose(); }}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/60 transition-colors text-left"
                            >
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarImage src={entry.photoURL || ""} alt={entry.displayName} />
                                    <AvatarFallback>{(entry.displayName?.[0] || "U").toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">{entry.displayName}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PublicProfilePage({ params }: { params: Promise<{ uid: string }> }) {
    const { uid } = use(params);
    const { user } = useAuth();
    const { followUser, unfollowUser, isFollowing, getFollowersFor, getFollowingFor } = useFollow();
    const router = useRouter();

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [modal, setModal] = useState<ModalType>(null);
    const [followersList, setFollowersList] = useState<FollowEntry[]>([]);
    const [followingList, setFollowingList] = useState<FollowEntry[]>([]);

    // If viewing own profile, redirect to the standard profile page
    useEffect(() => {
        if (user && uid === user.uid) {
            router.replace("/dashboard/profile");
        }
    }, [user, uid, router]);

    const loadProfile = useCallback(async () => {
        try {
            const snap = await getDoc(doc(db, "users", uid));
            const data = snap.exists() ? snap.data() : null;
            setProfile({
                uid,
                displayName: data?.displayName || "VoxLab User",
                photoURL: data?.photoURL || null,
                followersCount: data?.followersCount ?? 0,
                followingCount: data?.followingCount ?? 0,
                stats: data?.stats ?? {}
            });
            setFollowersCount(data?.followersCount ?? 0);
            setFollowingCount(data?.followingCount ?? 0);
        } catch (err) {
            console.error("Error loading profile:", err);
        } finally {
            setLoading(false);
        }
    }, [uid]);

    const checkFollowing = useCallback(async () => {
        if (!user) return;
        const result = await isFollowing(uid);
        setFollowing(result);
    }, [user, uid, isFollowing]);

    useEffect(() => {
        loadProfile();
        checkFollowing();
    }, [loadProfile, checkFollowing]);

    const handleOpenModal = async (type: ModalType) => {
        setModal(type);
        if (type === "followers" && followersList.length === 0) {
            const list = await getFollowersFor(uid);
            setFollowersList(list);
        }
        if (type === "following" && followingList.length === 0) {
            const list = await getFollowingFor(uid);
            setFollowingList(list);
        }
    };

    const handleFollow = async () => {
        if (!user || !profile) return;
        setFollowLoading(true);
        try {
            if (following) {
                await unfollowUser(uid);
                setFollowing(false);
                setFollowersCount(c => Math.max(0, c - 1));
            } else {
                await followUser(uid, profile.displayName, profile.photoURL);
                setFollowing(true);
                setFollowersCount(c => c + 1);
                // Refresh list if it was already loaded
                if (followersList.length > 0) {
                    const list = await getFollowersFor(uid);
                    setFollowersList(list);
                }
            }
        } catch (err) {
            console.error("Error toggling follow:", err);
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">User not found.</p>
                <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const isOwnProfile = user?.uid === uid;

    return (
        <>
            {modal === "followers" && (
                <FollowListModal
                    title={`Followers (${followersCount})`}
                    list={followersList}
                    onClose={() => setModal(null)}
                    onNavigate={(u) => router.push(`/dashboard/profile/${u}`)}
                />
            )}
            {modal === "following" && (
                <FollowListModal
                    title={`Following (${followingCount})`}
                    list={followingList}
                    onClose={() => setModal(null)}
                    onNavigate={(u) => router.push(`/dashboard/profile/${u}`)}
                />
            )}

            <div className="min-h-screen bg-background p-8">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Back Button */}
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>

                    {/* Profile Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center space-y-4">
                                <Avatar className="h-28 w-28">
                                    <AvatarImage src={profile.photoURL || ""} alt={profile.displayName} />
                                    <AvatarFallback className="text-4xl">
                                        {(profile.displayName?.[0] || "U").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold">{profile.displayName}</h2>
                                    <Badge variant="secondary" className="mt-1">VoxLab Member</Badge>
                                </div>

                                {/* Social counts */}
                                <div className="flex gap-8">
                                    <button
                                        onClick={() => handleOpenModal("followers")}
                                        className="flex flex-col items-center group cursor-pointer"
                                    >
                                        <span className="text-2xl font-bold group-hover:text-primary transition-colors">
                                            {followersCount}
                                        </span>
                                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                            Followers
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal("following")}
                                        className="flex flex-col items-center group cursor-pointer"
                                    >
                                        <span className="text-2xl font-bold group-hover:text-primary transition-colors">
                                            {followingCount}
                                        </span>
                                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                            Following
                                        </span>
                                    </button>
                                </div>

                                {/* Follow / Unfollow Button */}
                                {user && !isOwnProfile && (
                                    <Button
                                        onClick={handleFollow}
                                        disabled={followLoading}
                                        variant={following ? "outline" : "default"}
                                        className="min-w-[140px] gap-2"
                                    >
                                        {following ? (
                                            <>
                                                <UserMinus className="w-4 h-4" />
                                                Unfollow
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-4 h-4" />
                                                Follow
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>

                            {/* Activity Stats */}
                            {profile.stats && (
                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <div className="p-2 rounded-lg bg-blue-500/10">
                                            <Users className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Posts</p>
                                            <p className="text-lg font-bold">{profile.stats.postsCount ?? 0}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <div className="p-2 rounded-lg bg-green-500/10">
                                            <UserCheck className="w-5 h-5 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Comments</p>
                                            <p className="text-lg font-bold">{profile.stats.commentsCount ?? 0}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

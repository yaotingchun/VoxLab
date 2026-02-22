"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/contexts/FollowContext";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Users, UserPlus, UserMinus, ArrowLeft, X,
    Flame, Trophy, Mic, Award, Clock, MessageSquare,
    ThumbsUp, Eye, Lock, FileText
} from "lucide-react";
import Link from "next/link";
import { FollowEntry } from "@/lib/follow";
import { getUserBadges, BADGE_DEFINITIONS } from "@/lib/badges";
import { getRecentSessions } from "@/lib/sessions";
import { getStreak } from "@/lib/streaks";
import { PracticeSession } from "@/types/gamification";
import { Post } from "@/types/forum";
import { formatForumDate } from "@/lib/utils";

// ─── Rarity Level Labels ─────────────────────────────────────────────────────
const RARITY_LEVEL: Record<string, string> = {
    common: "LEVEL 1",
    rare: "LEVEL 2",
    epic: "LEVEL 3",
    legendary: "LEVEL 4"
};

// ─── Follow List Modal ────────────────────────────────────────────────────────
function FollowListModal({
    title, list, onClose, onNavigate
}: {
    title: string;
    list: FollowEntry[];
    onClose: () => void;
    onNavigate: (uid: string) => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-accent transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {list.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No users here yet.</p>
                    ) : list.map((entry) => (
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
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Tab Types ────────────────────────────────────────────────────────────────
type ProfileTab = "overview" | "posts";

// ─── Public Profile Interface ─────────────────────────────────────────────────
interface PublicProfile {
    uid: string;
    displayName: string;
    photoURL: string | null;
    followersCount: number;
    followingCount: number;
    streakCount: number;
    longestStreak: number;
    hideForumActivity?: boolean;
    stats?: {
        postsCount?: number;
        commentsCount?: number;
    };
}

type ModalType = "followers" | "following" | null;

export default function PublicProfilePage({ params }: { params: Promise<{ uid: string }> }) {
    const { uid } = use(params);
    const { user } = useAuth();
    const { followUser, unfollowUser, isFollowing, getFollowersFor, getFollowingFor } = useFollow();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [modal, setModal] = useState<ModalType>(null);
    const [followersList, setFollowersList] = useState<FollowEntry[]>([]);
    const [followingList, setFollowingList] = useState<FollowEntry[]>([]);

    // Gamification data
    const [badges, setBadges] = useState<Awaited<ReturnType<typeof getUserBadges>>>([]);
    const [sessions, setSessions] = useState<PracticeSession[]>([]);

    // Forum posts
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsLoaded, setPostsLoaded] = useState(false);

    // Redirect own profile
    useEffect(() => {
        if (user && uid === user.uid) router.replace("/dashboard/profile");
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
                streakCount: data?.streakCount ?? 0,
                longestStreak: data?.longestStreak ?? 0,
                hideForumActivity: data?.hideForumActivity ?? false,
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
        setFollowing(await isFollowing(uid));
    }, [user, uid, isFollowing]);

    const loadGamification = useCallback(async () => {
        try {
            const [badgeData, sessionData] = await Promise.all([
                getUserBadges(uid),
                getRecentSessions(uid, 20)
            ]);
            setBadges(badgeData);
            setSessions(sessionData);
        } catch (err) {
            console.error("Error loading gamification:", err);
        }
    }, [uid]);

    // Lazy-load posts only when tab is activated
    const loadUserPosts = useCallback(async () => {
        if (postsLoaded) return;
        setPostsLoading(true);
        try {
            const q = query(
                collection(db, "posts"),
                where("authorId", "==", uid),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            setUserPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
            setPostsLoaded(true);
        } catch (err) {
            console.error("Error loading posts:", err);
        } finally {
            setPostsLoading(false);
        }
    }, [uid, postsLoaded]);

    useEffect(() => {
        loadProfile();
        checkFollowing();
        loadGamification();
    }, [loadProfile, checkFollowing, loadGamification]);

    // Load posts when tab switches to "posts"
    useEffect(() => {
        if (activeTab === "posts") loadUserPosts();
    }, [activeTab, loadUserPosts]);

    const handleOpenModal = async (type: ModalType) => {
        setModal(type);
        if (type === "followers" && followersList.length === 0) setFollowersList(await getFollowersFor(uid));
        if (type === "following" && followingList.length === 0) setFollowingList(await getFollowingFor(uid));
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
                if (followersList.length > 0) setFollowersList(await getFollowersFor(uid));
            }
        } catch (err) {
            console.error("Error toggling follow:", err);
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
    if (!profile) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">User not found.</p>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
    );

    const isOwnProfile = user?.uid === uid;
    const earnedBadges = badges.filter(b => b.earned);
    const totalPracticeMinutes = Math.round(sessions.reduce((a, s) => a + (s.duration ?? 0), 0) / 60);
    const avgScore = sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.score ?? 0), 0) / sessions.length) : 0;

    const badgeBestScore = sessions.reduce((best, s) => Math.max(best, s.score ?? 0), 0);
    const badgeTotalSec = sessions.reduce((t, s) => t + (s.duration ?? 0), 0);
    const badgeLongestSec = sessions.reduce((best, s) => Math.max(best, s.duration ?? 0), 0);
    const badgeLiveStats = {
        sessionsCount: sessions.length,
        streakCount: profile.streakCount,
        longestStreak: profile.longestStreak,
        averageScore: avgScore,
        postsCount: profile.stats?.postsCount ?? 0,
        likesReceived: 0,
        followersCount,
        sessionDuration: badgeLongestSec,
        totalPracticeSeconds: badgeTotalSec,
        bestScore: badgeBestScore
    };

    const TABS: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
        { id: "overview", label: "Overview", icon: Trophy },
        { id: "posts", label: `Posts (${profile.stats?.postsCount ?? 0})`, icon: FileText }
    ];

    return (
        <>
            {modal === "followers" && (
                <FollowListModal title={`Followers (${followersCount})`} list={followersList} onClose={() => setModal(null)} onNavigate={(u) => router.push(`/dashboard/profile/${u}`)} />
            )}
            {modal === "following" && (
                <FollowListModal title={`Following (${followingCount})`} list={followingList} onClose={() => setModal(null)} onNavigate={(u) => router.push(`/dashboard/profile/${u}`)} />
            )}

            <div className="min-h-screen bg-background p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Back Button */}
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />Back
                    </Button>

                    {/* ── Hero Card ──────────────────────────────────────────── */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                <Avatar className="h-24 w-24 flex-shrink-0">
                                    <AvatarImage src={profile.photoURL || ""} alt={profile.displayName} />
                                    <AvatarFallback className="text-4xl">{(profile.displayName?.[0] || "U").toUpperCase()}</AvatarFallback>
                                </Avatar>

                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-2xl font-bold">{profile.displayName}</h2>
                                    <Badge variant="secondary" className="mt-1">VoxLab Member</Badge>

                                    {profile.streakCount > 0 && (
                                        <div className="inline-flex items-center gap-2 mt-3 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1">
                                            <Flame className="w-4 h-4 text-orange-500" />
                                            <span className="text-sm font-bold text-orange-500">{profile.streakCount} day streak</span>
                                        </div>
                                    )}

                                    <div className="flex gap-6 mt-4 justify-center md:justify-start">
                                        <button onClick={() => handleOpenModal("followers")} className="flex flex-col items-center group">
                                            <span className="text-xl font-bold group-hover:text-primary transition-colors">{followersCount}</span>
                                            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Followers</span>
                                        </button>
                                        <button onClick={() => handleOpenModal("following")} className="flex flex-col items-center group">
                                            <span className="text-xl font-bold group-hover:text-primary transition-colors">{followingCount}</span>
                                            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Following</span>
                                        </button>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xl font-bold">{earnedBadges.length}</span>
                                            <span className="text-xs text-muted-foreground">Badges</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: "Sessions", value: sessions.length, icon: Mic, color: "text-blue-500", bg: "bg-blue-500/10" },
                                        { label: "Avg Score", value: avgScore ? `${avgScore}%` : "—", icon: Award, color: "text-amber-500", bg: "bg-amber-500/10" },
                                        { label: "Practice", value: `${totalPracticeMinutes}m`, icon: Clock, color: "text-green-500", bg: "bg-green-500/10" }
                                    ].map(s => (
                                        <div key={s.label} className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-card">
                                            <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                                            <p className="text-lg font-bold">{s.value}</p>
                                            <p className="text-xs text-muted-foreground">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {user && !isOwnProfile && (
                                <div className="mt-5 flex justify-center md:justify-start">
                                    <Button onClick={handleFollow} disabled={followLoading} variant={following ? "outline" : "default"} className="min-w-[140px] gap-2">
                                        {following ? <><UserMinus className="w-4 h-4" />Unfollow</> : <><UserPlus className="w-4 h-4" />Follow</>}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Tabs ───────────────────────────────────────────────── */}
                    <div className="flex gap-1 border-b">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Overview Tab ───────────────────────────────────────── */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* Streak Card */}
                            {(profile.streakCount > 0 || profile.longestStreak > 0) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" />Streak</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-around">
                                            <div className="text-center">
                                                <p className="text-4xl font-black text-orange-500">{profile.streakCount}</p>
                                                <p className="text-xs text-muted-foreground mt-1">Current Streak</p>
                                            </div>
                                            <div className="w-px h-12 bg-border" />
                                            <div className="text-center">
                                                <p className="text-4xl font-black text-amber-400">{profile.longestStreak}</p>
                                                <p className="text-xs text-muted-foreground mt-1">Longest Streak</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Achievements */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" />Achievements</CardTitle>
                                    <CardDescription>
                                        {earnedBadges.length === 0 ? "No badges earned yet." : `${earnedBadges.length} / ${badges.length} earned`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border">
                                        {badges.map(b => {
                                            const def = BADGE_DEFINITIONS.find(d => d.id === b.id);
                                            const prog = def ? def.progress(badgeLiveStats) : { current: b.earned ? 1 : 0, max: 1 };
                                            const pct = Math.min(100, Math.round((prog.current / prog.max) * 100));
                                            const tileColor = b.earned ? (def?.color ?? "#6366f1") : "#374151";
                                            return (
                                                <div key={b.id} className={`flex items-center gap-5 px-5 py-4 hover:bg-accent/20 transition-colors ${!b.earned ? "opacity-60" : ""}`}>
                                                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl gap-0.5" style={{ background: tileColor }}>
                                                        <span className="text-2xl leading-none">{b.icon}</span>
                                                        <span className="text-[8px] font-black text-white/90 tracking-wider">{RARITY_LEVEL[b.rarity]}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className={`font-bold text-sm ${b.earned ? "text-foreground" : "text-muted-foreground"}`}>{b.name}</p>
                                                            <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">{prog.current}/{prog.max}</span>
                                                        </div>
                                                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-1.5">
                                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: b.earned ? (def?.color ?? "#6366f1") : "#ca8a04" }} />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-tight">{b.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ── Posts Tab ──────────────────────────────────────────── */}
                    {activeTab === "posts" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Forum Posts
                                </CardTitle>
                                <CardDescription>
                                    {profile.hideForumActivity ? "This user has hidden their forum activity." : `${profile.stats?.postsCount ?? 0} posts`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Hidden by user */}
                                {profile.hideForumActivity ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                                        <div className="p-4 rounded-full bg-muted"><Lock className="w-8 h-8" /></div>
                                        <p className="font-medium">Forum activity is private</p>
                                        <p className="text-sm text-center">This user has chosen to hide their forum posts.</p>
                                    </div>
                                ) : postsLoading ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
                                        ))}
                                    </div>
                                ) : userPosts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                                        <FileText className="w-10 h-10 opacity-30" />
                                        <p>No posts yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {userPosts.map(post => (
                                            <Link
                                                key={post.id}
                                                href={`/forum/${post.id}`}
                                                className="block p-4 rounded-xl border bg-card hover:bg-accent/5 hover:border-border/70 transition-all group"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{post.title}</h3>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{post.content}</p>
                                                        {post.tags && post.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {post.tags.slice(0, 3).map(tag => (
                                                                    <span key={tag} className="text-[10px] font-medium bg-primary/5 text-primary/80 border border-primary/10 px-1.5 py-0.5 rounded">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                                                        {post.createdAt ? formatForumDate(post.createdAt.toDate()) : "Just now"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{post.likes ?? 0}</span>
                                                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.commentCount ?? 0}</span>
                                                    <span className="flex items-center gap-1 ml-auto"><Eye className="w-3.5 h-3.5" />{post.viewCount ?? 0}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </>
    );
}

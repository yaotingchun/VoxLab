"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/contexts/FollowContext";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, collectionGroup, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Users, UserPlus, UserMinus, ArrowLeft, X,
    Flame, Trophy, Mic, Award, Clock, MessageSquare,
    ThumbsUp, Eye, Lock, FileText, CornerDownRight,
    Star, Target, History, BookOpen, Presentation as PresentationIcon, Search, TrendingUp
} from "lucide-react";
import Link from "next/link";
import { FollowEntry } from "@/lib/follow";
import { getUserBadges, BADGE_DEFINITIONS } from "@/lib/badges";
import { getRecentSessions } from "@/lib/sessions";
import { getUserStreak } from "@/lib/streak";
import { PracticeSession } from "@/types/gamification";
import { Post } from "@/types/forum";
import { formatForumDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressTrackerTab } from "@/components/profile/ProgressTrackerTab";

// ─── Design Tokens ──────────────────────────────────────────────────────────
const GLASS_CARD = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 hover:bg-white/[0.05] transition-all duration-300";

const RARITY_STYLES = {
    common: "border-slate-500/30 bg-slate-500/10",
    rare: "border-blue-500/40 bg-blue-500/10",
    epic: "border-purple-500/40 bg-purple-500/10",
    legendary: "border-yellow-500/40 bg-yellow-500/10"
};

const RARITY_LEVEL: Record<string, string> = {
    common: "LEVEL 1", rare: "LEVEL 2", epic: "LEVEL 3", legendary: "LEVEL 4"
};

// ─── Follow List Modal ────────────────────────────────────────────────────────
function FollowListModal({ title, list, onClose, onNavigate, description }: {
    title: string; list: FollowEntry[]; onClose: () => void; onNavigate: (uid: string) => void; description?: string;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">{title}</h2>
                        {description && <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{description}</p>}
                    </div>
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

// ─── Badge List Modal ────────────────────────────────────────────────────────
function BadgeListModal({ badges, onClose }: {
    badges: Awaited<ReturnType<typeof getUserBadges>>;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-lg font-black tracking-tight">Earned Badges ({badges.length})</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-accent transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {badges.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No badges earned yet.</p>
                    ) : badges.map(badge => (
                        <div key={badge.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${RARITY_STYLES[badge.rarity as keyof typeof RARITY_STYLES] || ""}`}>
                                {badge.icon}
                            </div>
                            <div>
                                <p className="font-black text-white text-sm">{badge.name}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{badge.rarity}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Tab Types ────────────────────────────────────────────────────────────────
type ProfileTab = "overview" | "history" | "tracker";
type Tab = ProfileTab;

// ─── Public Profile Interface ─────────────────────────────────────────────────
interface PublicProfile {
    uid: string;
    displayName: string;
    photoURL: string | null;
    followersCount: number;
    followingCount: number;
    streakCount: number;
    longestStreak: number;
    shareProgressTracker?: boolean;
    shareHistory?: boolean;
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
    const [modal, setModal] = useState<"followers" | "following" | "friends" | "badges" | null>(null);
    const [followersList, setFollowersList] = useState<FollowEntry[]>([]);
    const [followingList, setFollowingList] = useState<FollowEntry[]>([]);
    const [friendsList, setFriendsList] = useState<FollowEntry[]>([]);

    // Gamification data
    const [badges, setBadges] = useState<Awaited<ReturnType<typeof getUserBadges>>>([]);
    const [sessions, setSessions] = useState<PracticeSession[]>([]);

    // Forum posts
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsLoaded, setPostsLoaded] = useState(false);

    // Commented posts
    const [commentedPosts, setCommentedPosts] = useState<(Post & { userComment: string })[]>([]);
    const [commentedLoading, setCommentedLoading] = useState(false);
    const [commentedLoaded, setCommentedLoaded] = useState(false);

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
                shareProgressTracker: data?.shareProgressTracker ?? false,
                shareHistory: data?.shareHistory ?? false
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

    // Lazy-load posts the user commented on
    const loadCommentedPosts = useCallback(async () => {
        if (commentedLoaded) return;
        setCommentedLoading(true);
        try {
            const commentsSnap = await getDocs(
                query(
                    collectionGroup(db, "comments"),
                    where("authorId", "==", uid),
                    orderBy("createdAt", "desc"),
                    limit(50)
                )
            );

            // Deduplicate by post ID, keep first (most recent) comment per post
            const seen = new Set<string>();
            const entries: { postId: string; comment: string }[] = [];
            commentsSnap.docs.forEach(d => {
                const postId = d.ref.parent.parent?.id;
                if (postId && !seen.has(postId)) {
                    seen.add(postId);
                    entries.push({ postId, comment: d.data().content as string });
                }
            });

            // Fetch post metadata for each unique post
            const posts = await Promise.all(
                entries.map(async ({ postId, comment }) => {
                    const snap = await getDoc(doc(db, "posts", postId));
                    if (!snap.exists()) return null;
                    return { id: snap.id, ...snap.data(), userComment: comment } as Post & { userComment: string };
                })
            );

            setCommentedPosts(posts.filter(Boolean) as (Post & { userComment: string })[]);
            setCommentedLoaded(true);
        } catch (err) {
            console.error("Error loading commented posts:", err);
        } finally {
            setCommentedLoading(false);
        }
    }, [uid, commentedLoaded]);

    useEffect(() => {
        loadProfile();
        checkFollowing();
        loadGamification();
    }, [loadProfile, checkFollowing, loadGamification]);

    useEffect(() => {
        // loadUserPosts(); // Removed for now as per user request to remove forum from public profile
    }, [activeTab]);

    // Helpers
    const formatDate = (d: Date) => d.toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true
    });

    const formatDuration = (seconds?: number) => {
        if (!seconds) return "0s";
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    };

    const getModeInfo = (mode?: string) => {
        switch (mode?.toLowerCase()) {
            case "lecture": return { icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10" };
            case "interview": return { icon: Mic, color: "text-purple-400", bg: "bg-purple-500/10" };
            case "presentation": return { icon: PresentationIcon, color: "text-green-400", bg: "bg-green-500/10" };
            default: return { icon: Target, color: "text-primary", bg: "bg-primary/10" };
        }
    };

    const handleOpenModal = async (type: "followers" | "following" | "friends" | "badges") => {
        setModal(type);
        if (type === "followers" && followersList.length === 0) setFollowersList(await getFollowersFor(uid));
        if (type === "following" && followingList.length === 0) setFollowingList(await getFollowingFor(uid));
        if (type === "friends" && friendsList.length === 0) {
            const f = await getFollowersFor(uid);
            const g = await getFollowingFor(uid);
            const ids = new Set(g.map(u => u.uid));
            setFriendsList(f.filter(u => ids.has(u.uid)));
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
        postsCount: 0,
        likesReceived: 0,
        followersCount,
        sessionDuration: badgeLongestSec,
        totalPracticeSeconds: badgeTotalSec,
        bestScore: badgeBestScore
    };

    const TABS = [
        { id: "overview" as Tab, label: "Overview", icon: Star },
        ...(profile.shareHistory ? [{ id: "history" as Tab, label: "History", icon: History }] : []),
        ...(profile.shareProgressTracker ? [{ id: "tracker" as Tab, label: "Progress Tracker", icon: TrendingUp }] : [])
    ];

    return (
        <>
            {modal === "followers" && <FollowListModal title={`Followers (${followersCount})`} list={followersList} onClose={() => setModal(null)} onNavigate={u => router.push(`/dashboard/profile/${u}`)} />}
            {modal === "following" && <FollowListModal title={`Following (${followingCount})`} list={followingList} onClose={() => setModal(null)} onNavigate={u => router.push(`/dashboard/profile/${u}`)} />}
            {modal === "friends" && <FollowListModal title={`Friends (${friendsList.length})`} list={friendsList} onClose={() => setModal(null)} onNavigate={u => router.push(`/dashboard/profile/${u}`)} description="Users who follow each other" />}
            {modal === "badges" && <BadgeListModal badges={earnedBadges} onClose={() => setModal(null)} />}

            <div className="min-h-screen bg-background p-6 md:p-10">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Back Button */}
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />Back
                    </Button>

                    {/* ── Hero Card ──────────────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className={`${GLASS_CARD} overflow-hidden relative group`}>
                            {/* Animated Background Orbs */}
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none group-hover:bg-primary/30 transition-colors duration-700" />
                            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

                            <CardContent className="p-8 md:p-10 relative z-10">
                                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative group/avatar">
                                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-110 group-hover/avatar:scale-125 transition-transform duration-500" />
                                            <Avatar className="h-32 w-32 border-4 border-white/10 ring-4 ring-primary/5 shadow-2xl relative">
                                                <AvatarImage src={profile.photoURL || ""} alt={profile.displayName} className="object-cover" />
                                                <AvatarFallback className="text-5xl bg-gradient-to-br from-gray-800 to-gray-950 font-black text-white">
                                                    {(profile.displayName?.[0] || "U").toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        {user && !isOwnProfile && (
                                            <Button
                                                onClick={handleFollow}
                                                disabled={followLoading}
                                                variant={following ? "outline" : "default"}
                                                className={`min-w-[140px] h-11 gap-2 rounded-xl font-bold transition-all active:scale-95 ${!following ? 'bg-primary hover:bg-primary/90' : 'border-white/10 hover:bg-white/5'}`}
                                            >
                                                {following ? <><UserMinus className="w-3 h-3" />Unfollow</> : <><UserPlus className="w-3 h-3" />Follow</>}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <div className="flex flex-col md:flex-row items-center md:items-baseline gap-4">
                                                <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
                                                    {profile.displayName}
                                                </h2>
                                            </div>
                                            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                                                <Badge variant="secondary" className="bg-white/5 border-white/10 text-white/70">
                                                    VoxLab Member
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-8 justify-center md:justify-start pt-2 text-center md:text-left">
                                            <button onClick={() => handleOpenModal("followers")} className="group/stat text-center">
                                                <p className="text-2xl font-black text-white group-hover/stat:text-primary transition-colors">{followersCount}</p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover/stat:text-primary/70">Followers</p>
                                            </button>
                                            <button onClick={() => handleOpenModal("following")} className="group/stat text-center">
                                                <p className="text-2xl font-black text-white group-hover/stat:text-primary transition-colors">{followingCount}</p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover/stat:text-primary/70">Following</p>
                                            </button>
                                            <button onClick={() => handleOpenModal("friends")} className="group/stat text-center">
                                                <p className="text-2xl font-black text-white group-hover/stat:text-primary transition-colors">{friendsList.length}</p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover/stat:text-primary/70">Friends</p>
                                            </button>
                                            <button onClick={() => handleOpenModal("badges")} className="group/stat text-center">
                                                <p className="text-2xl font-black text-white group-hover/stat:text-primary transition-colors">{earnedBadges.length}</p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover/stat:text-primary/70">Badges</p>
                                            </button>
                                        </div>

                                    </div>

                                    {/* Score Card Overlay */}
                                    <div className="flex flex-col gap-3 min-w-[140px]">
                                        {[
                                            { label: "Practice", value: `${totalPracticeMinutes}m`, icon: Clock, color: "text-green-400", bg: "bg-green-500/10" },
                                            { label: "Avg Score", value: avgScore ? `${avgScore}%` : "—", icon: Award, color: "text-amber-400", bg: "bg-amber-500/10" },
                                            { label: "Streak", value: profile.streakCount, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" }
                                        ].map(s => (
                                            <div key={s.label} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3 hover:bg-white/10 transition-colors">
                                                <div className={`p-2 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                                                <div className="text-left">
                                                    <p className="text-lg font-black leading-none">{s.value}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">{s.label}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

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

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="mt-6"
                        >
                            {/* ── Overview Tab ───────────────────────────────────────── */}
                            {activeTab === "overview" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Streak Card */}
                                    <Card className={GLASS_CARD}>
                                        <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" />Streak</CardTitle></CardHeader>
                                        <CardContent className="space-y-4 text-center">
                                            <div className="flex items-center justify-around py-4">
                                                <div>
                                                    <p className="text-5xl font-black text-orange-500">{profile.streakCount}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Current</p>
                                                </div>
                                                <div className="w-px h-16 bg-white/5" />
                                                <div>
                                                    <p className="text-5xl font-black text-purple-400">{profile.longestStreak}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Best</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-400 font-medium">Practice daily to maintain your growth!</p>
                                        </CardContent>
                                    </Card>

                                    {/* Public Account Info */}
                                    <Card className={GLASS_CARD}>
                                        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" />Member Info</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Joined VoxLab</p>
                                                    <p className="text-lg font-black text-white">Community Member</p>
                                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold font-mono">Verified Account</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Status</p>
                                                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Active</Badge>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-white">{earnedBadges.length}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Achievements</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                                    All practice data and forum contributions are managed by VoxLab's gamification system.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Achievements Grid */}
                                    <div className="col-span-1 md:col-span-2">
                                        <Card className={GLASS_CARD}>
                                            <CardHeader className="flex flex-row items-center justify-between pb-6">
                                                <div>
                                                    <CardTitle className="text-xl font-black text-white">Earned Badges</CardTitle>
                                                    <CardDescription className="text-xs font-medium text-gray-500 mt-1">
                                                        Showing {earnedBadges.length} earned achievements
                                                    </CardDescription>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                    {badges.map(b => {
                                                        const def = BADGE_DEFINITIONS.find(d => d.id === b.id);
                                                        const prog = def ? def.progress(badgeLiveStats) : { current: b.earned ? 1 : 0, max: 1 };
                                                        const pct = Math.min(100, Math.round((prog.current / prog.max) * 100));

                                                        return (
                                                            <div key={b.id} className={`relative group/badge p-4 rounded-3xl border transition-all duration-300 ${b.earned ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5 opacity-40'}`}>
                                                                <div className="flex flex-col items-center text-center gap-3">
                                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xl transition-transform duration-500 group-hover/badge:scale-110 ${RARITY_STYLES[b.rarity as keyof typeof RARITY_STYLES]}`}>
                                                                        <span className={b.earned ? "" : "grayscale"}>{b.icon}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-white truncate w-full px-1">{b.name}</p>
                                                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5">{RARITY_LEVEL[b.rarity]}</p>
                                                                    </div>
                                                                    <div className="w-full space-y-1">
                                                                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-500">
                                                                            <span>Progress</span>
                                                                            <span>{pct}%</span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                            <motion.div
                                                                                initial={{ width: 0 }}
                                                                                animate={{ width: `${pct}%` }}
                                                                                className={`h-full rounded-full ${b.earned ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-gray-700'}`}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* ── History Tab ────────────────────────────────────────── */}
                            {activeTab === "history" && profile.shareHistory && (
                                <Card className={GLASS_CARD}>
                                    <CardHeader>
                                        <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                                            <History className="w-5 h-5 text-primary" />
                                            Practice History
                                        </CardTitle>
                                        <CardDescription className="text-xs font-medium text-gray-400 mt-1">
                                            {sessions.length} sessions recorded
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-2">
                                        <div className="space-y-3">
                                            {sessions.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                                                    <div className="p-4 rounded-full bg-white/5 border border-white/5"><History className="w-10 h-10 opacity-20" /></div>
                                                    <p className="text-sm font-bold uppercase tracking-widest">No sessions yet</p>
                                                </div>
                                            ) : sessions.map((s, i) => (
                                                <div key={s.id || i} className="group relative px-2">
                                                    <div className="p-5 rounded-3xl border border-white/5 bg-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10 shadow-lg">
                                                        <div className="flex items-center gap-4">
                                                            {(() => {
                                                                const info = getModeInfo(s.mode);
                                                                return (
                                                                    <div className={`w-12 h-12 rounded-xl ${info.bg} border border-white/5 flex items-center justify-center ${info.color} group-hover:scale-110 transition-transform`}>
                                                                        <info.icon className="w-6 h-6" />
                                                                    </div>
                                                                );
                                                            })()}
                                                            <div>
                                                                <p className="font-extrabold text-white group-hover:text-primary transition-colors capitalize">{s.mode || "practice"} Session</p>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{s.createdAt ? formatDate((s.createdAt as any).toDate()) : "—"}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <p className="text-lg font-black text-white">{formatDuration(s.duration)}</p>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Duration</p>
                                                            </div>
                                                            <div className="text-right min-w-[60px]">
                                                                <p className="text-xl font-black text-white">{s.score ?? 0}%</p>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-primary transition-colors">Score</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* ── Progress Tracker Tab ──────────────────────────────── */}
                            {activeTab === "tracker" && profile.shareProgressTracker && (
                                <div className="space-y-6">
                                    <ProgressTrackerTab sessions={sessions} />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

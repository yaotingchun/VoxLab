"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/contexts/FollowContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc, collection, collectionGroup, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Mail, Calendar, Clock, TrendingUp, Award, LogOut, Mic,
    Users, UserCheck, X, Flame, Trophy, History, Star, UserPlus, EyeOff, Video,
    MessageSquare, FileText, ThumbsUp, Eye, CornerDownRight, Pencil, Search
} from "lucide-react";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { UserSearchModal } from "@/components/profile/UserSearchModal";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FollowEntry } from "@/lib/follow";
import { getUserBadges, BADGE_DEFINITIONS } from "@/lib/badges";
import { getRecentSessions } from "@/lib/sessions";
import { getStreak } from "@/lib/streaks";
import { getFriends } from "@/lib/friends";
import { Post } from "@/types/forum";
import { PracticeSession } from "@/types/gamification";

// ─── Rarity Styles ───────────────────────────────────────────────────────────
const RARITY_STYLES = {
    common: "border-slate-600 bg-slate-800/50",
    rare: "border-blue-500/60 bg-blue-900/20",
    epic: "border-purple-500/60 bg-purple-900/20",
    legendary: "border-yellow-500/60 bg-yellow-900/20"
};

const RARITY_GLOW = {
    common: "",
    rare: "shadow-blue-900/30",
    epic: "shadow-purple-900/30",
    legendary: "shadow-yellow-900/30 shadow-lg"
};

// ─── Follow List Modal ────────────────────────────────────────────────────────
function FollowListModal({ title, list, onClose, onNavigate }: {
    title: string; list: FollowEntry[]; onClose: () => void; onNavigate: (uid: string) => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-accent transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {list.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No users here yet.</p>
                    ) : list.map(entry => (
                        <button key={entry.uid} onClick={() => { onNavigate(entry.uid); onClose(); }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/60 transition-colors text-left">
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
type Tab = "overview" | "history" | "friends" | "forum";

export default function ProfilePage() {
    const { user, loading, logout } = useAuth();
    const { followersCount, followingCount, followers, following, loadMyFollowData } = useFollow();
    const { profile: firestoreProfile } = useUserProfile();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [modal, setModal] = useState<"followers" | "following" | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);

    // Gamification data
    const [streakCount, setStreakCount] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [badges, setBadges] = useState<Awaited<ReturnType<typeof getUserBadges>>>([]);
    const [sessions, setSessions] = useState<PracticeSession[]>([]);
    const [friends, setFriends] = useState<FollowEntry[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Privacy settings
    const [hideForumActivity, setHideForumActivity] = useState(false);
    const [privacySaving, setPrivacySaving] = useState(false);

    // Forum activity
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsLoaded, setPostsLoaded] = useState(false);
    const [commentedPosts, setCommentedPosts] = useState<(Post & { userComment: string })[]>([]);
    const [commentedLoading, setCommentedLoading] = useState(false);
    const [commentedLoaded, setCommentedLoaded] = useState(false);
    const [showBadgeHover, setShowBadgeHover] = useState(false);
    const badgeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading && !user) router.push("/");
    }, [user, loading, router]);

    useEffect(() => {
        if (user && !dataLoaded) {
            Promise.all([
                loadMyFollowData(),
                getStreak(user.uid).then(s => { setStreakCount(s.streakCount); setLongestStreak(s.longestStreak); }),
                getUserBadges(user.uid).then(setBadges),
                getRecentSessions(user.uid, 20).then(setSessions),
                getFriends(user.uid).then(setFriends),
                getDoc(doc(db, "users", user.uid)).then(snap => {
                    if (snap.exists()) setHideForumActivity(snap.data()?.hideForumActivity ?? false);
                })
            ]).then(() => setDataLoaded(true));
        }
    }, [user, dataLoaded, loadMyFollowData]);

    const handleToggleHideForumActivity = async () => {
        if (!user || privacySaving) return;
        const newValue = !hideForumActivity;
        setHideForumActivity(newValue);
        setPrivacySaving(true);
        try {
            await setDoc(doc(db, "users", user.uid), { hideForumActivity: newValue }, { merge: true });
        } catch (err) {
            console.error("Failed to save privacy setting:", err);
            setHideForumActivity(!newValue); // revert on error
        } finally {
            setPrivacySaving(false);
        }
    };

    const loadUserPosts = useCallback(async () => {
        if (!user || postsLoaded) return;
        setPostsLoading(true);
        try {
            const snap = await getDocs(query(
                collection(db, "posts"),
                where("authorId", "==", user.uid),
                orderBy("createdAt", "desc")
            ));
            setUserPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
            setPostsLoaded(true);
        } catch (err) { console.error(err); }
        finally { setPostsLoading(false); }
    }, [user, postsLoaded]);

    const loadCommentedPosts = useCallback(async () => {
        if (!user || commentedLoaded) return;
        setCommentedLoading(true);
        try {
            const snap = await getDocs(query(
                collectionGroup(db, "comments"),
                where("authorId", "==", user.uid),
                orderBy("createdAt", "desc"),
                limit(50)
            ));
            const seen = new Set<string>();
            const entries: { postId: string; comment: string }[] = [];
            snap.docs.forEach(d => {
                const postId = d.ref.parent.parent?.id;
                if (postId && !seen.has(postId)) {
                    seen.add(postId);
                    entries.push({ postId, comment: d.data().content as string });
                }
            });
            const posts = await Promise.all(entries.map(async ({ postId, comment }) => {
                const ps = await getDoc(doc(db, "posts", postId));
                if (!ps.exists()) return null;
                return { id: ps.id, ...ps.data(), userComment: comment } as Post & { userComment: string };
            }));
            setCommentedPosts(posts.filter(Boolean) as (Post & { userComment: string })[]);
            setCommentedLoaded(true);
        } catch (err) { console.error(err); }
        finally { setCommentedLoading(false); }
    }, [user, commentedLoaded]);

    // Helpers
    const formatDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const earnedBadges = badges.filter(b => b.earned);
    const totalPracticeMinutes = Math.round(sessions.reduce((a, s) => a + (s.duration ?? 0), 0) / 60);
    const avgScore = sessions.length
        ? Math.round(sessions.reduce((a, s) => a + (s.score ?? 0), 0) / sessions.length)
        : 0;


    const TABS = [
        { id: "overview" as Tab, label: "Overview", icon: Star },
        { id: "history" as Tab, label: "History", icon: History },
        { id: "friends" as Tab, label: `Friends (${friends.length})`, icon: Users },
        { id: "forum" as Tab, label: "Forum Activity", icon: MessageSquare }
    ];

    // Trigger lazy loads
    if (activeTab === "forum" && !postsLoaded && !postsLoading) loadUserPosts();
    if (activeTab === "forum" && !commentedLoaded && !commentedLoading) loadCommentedPosts();

    // Badge progress stats (used in overview)
    const badgeBestScore = sessions.reduce((best, s) => Math.max(best, s.score ?? 0), 0);
    const badgeTotalSec = sessions.reduce((t, s) => t + (s.duration ?? 0), 0);
    const badgeLongestSec = sessions.reduce((best, s) => Math.max(best, s.duration ?? 0), 0);
    const badgeLiveStats = {
        sessionsCount: sessions.length,
        streakCount,
        longestStreak,
        averageScore: avgScore,
        postsCount: 0,
        likesReceived: 0,
        followersCount,
        sessionDuration: badgeLongestSec,
        totalPracticeSeconds: badgeTotalSec,
        bestScore: badgeBestScore
    };
    const RARITY_LEVEL: Record<string, string> = {
        common: "LEVEL 1", rare: "LEVEL 2", epic: "LEVEL 3", legendary: "LEVEL 4"
    };

    return (
        <>
            {modal === "followers" && <FollowListModal title={`Followers (${followersCount})`} list={followers} onClose={() => setModal(null)} onNavigate={uid => router.push(`/dashboard/profile/${uid}`)} />}
            {modal === "following" && <FollowListModal title={`Following (${followingCount})`} list={following} onClose={() => setModal(null)} onNavigate={uid => router.push(`/dashboard/profile/${uid}`)} />}
            {showEditModal && firestoreProfile && <EditProfileModal profile={firestoreProfile} onClose={() => setShowEditModal(false)} />}
            {showSearchModal && <UserSearchModal onClose={() => setShowSearchModal(false)} />}

            <div className="min-h-screen bg-background p-6 md:p-10">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                            <p className="text-muted-foreground">Your journey, achievements, and community.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowSearchModal(true)} className="gap-2">
                                <Search className="w-4 h-4" />Find Friends
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-2">
                                <Pencil className="w-4 h-4" />Edit Profile
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
                        </div>
                    </div>

                    {/* Profile Hero Card */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                <Avatar className="h-24 w-24 flex-shrink-0">
                                    <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                                    <AvatarFallback className="text-4xl">
                                        {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-2xl font-bold">{user.displayName || "VoxLab User"}</h2>
                                    {firestoreProfile?.username && (
                                        <p className="text-xs text-primary/70 font-mono mt-0.5">@{firestoreProfile.username}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    {firestoreProfile?.bio && (
                                        <p className="text-sm italic text-muted-foreground/80 mt-2 max-w-sm border-l-2 border-primary/30 pl-3 leading-relaxed">
                                            {firestoreProfile.bio}
                                        </p>
                                    )}

                                    {/* Streak Banner */}
                                    {streakCount > 0 && (
                                        <div className="inline-flex items-center gap-2 mt-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1">
                                            <Flame className="w-4 h-4 text-orange-500" />
                                            <span className="text-sm font-bold text-orange-500">{streakCount} day streak</span>
                                        </div>
                                    )}

                                    {/* Social Stats Row */}
                                    <div className="flex gap-6 mt-4 justify-center md:justify-start">
                                        <button onClick={() => setModal("followers")} className="flex flex-col items-center group">
                                            <span className="text-xl font-bold group-hover:text-primary transition-colors">{followersCount}</span>
                                            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Followers</span>
                                        </button>
                                        <button onClick={() => setModal("following")} className="flex flex-col items-center group">
                                            <span className="text-xl font-bold group-hover:text-primary transition-colors">{followingCount}</span>
                                            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Following</span>
                                        </button>
                                        <div
                                            className="flex flex-col items-center cursor-default relative"
                                            onMouseEnter={() => setShowBadgeHover(true)}
                                            onMouseLeave={() => setShowBadgeHover(false)}
                                            ref={badgeRef}
                                        >
                                            <span className="text-xl font-bold hover:text-primary transition-colors">{earnedBadges.length}</span>
                                            <span className="text-xs text-muted-foreground">Badges</span>

                                            <AnimatePresence>
                                                {showBadgeHover && earnedBadges.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute top-full mt-2 z-50 p-4 bg-card/90 backdrop-blur-md border rounded-xl shadow-2xl min-w-[240px]"
                                                    >
                                                        <p className="text-[10px] font-bold text-muted-foreground mb-3 tracking-widest uppercase">Earned Badges</p>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {earnedBadges.map(b => (
                                                                <div key={b.id} className="flex flex-col items-center gap-1 group/item">
                                                                    <div
                                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm border border-white/5"
                                                                        style={{ background: b.color || '#6366f1' }}
                                                                    >
                                                                        {b.icon}
                                                                    </div>
                                                                    <span className="text-[9px] text-center font-medium truncate w-full">{b.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
                                                            <span className="text-[10px] text-muted-foreground">Total Earned</span>
                                                            <span className="text-xs font-bold text-primary">{earnedBadges.length} / {badges.length}</span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-3 md:gap-4">
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
                        </CardContent>
                    </Card>

                    {/* Tabs */}
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

                    {/* ── Overview Tab ────────────────────────────────────────── */}
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Streak Card */}
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" />Streak</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-around">
                                        <div className="text-center">
                                            <p className="text-4xl font-black text-orange-500">{streakCount}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Current Streak</p>
                                        </div>
                                        <div className="w-px h-12 bg-border" />
                                        <div className="text-center">
                                            <p className="text-4xl font-black text-amber-400">{longestStreak}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Longest Streak</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-center text-muted-foreground">Practice daily to keep your streak alive!</p>
                                </CardContent>
                            </Card>

                            {/* Achievements — full-width Duolingo-style list */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" />Achievements</CardTitle>
                                    <CardDescription>
                                        {earnedBadges.length === 0 ? "Complete a session to earn your first badge!" : `${earnedBadges.length} / ${badges.length} earned`}
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

                            {/* Account Details */}
                            <Card className="md:col-span-2">
                                <CardHeader><CardTitle>Account</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" /><span>Joined</span></div>
                                        <span>{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" /><span>Email Status</span></div>
                                        <Badge variant={user.emailVerified ? "default" : "secondary"}>
                                            {user.emailVerified ? "Verified" : "Unverified"}
                                        </Badge>
                                    </div>

                                    {/* Privacy Toggle */}
                                    <div className="flex items-center justify-between py-1">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <EyeOff className="w-4 h-4" />
                                            <span>Hide forum activity (posts &amp; comments) from public profile</span>
                                        </div>
                                        <button
                                            onClick={handleToggleHideForumActivity}
                                            disabled={privacySaving}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${hideForumActivity ? "bg-primary" : "bg-muted-foreground/30"
                                                }`}
                                            aria-label="Toggle forum activity visibility"
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hideForumActivity ? "translate-x-6" : "translate-x-1"
                                                }`} />
                                        </button>
                                    </div>

                                    <Button variant="destructive" className="w-full mt-2" onClick={async () => { await logout(); router.push("/"); }}>
                                        <LogOut className="w-4 h-4 mr-2" />Sign Out
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}


                    {/* ── History Tab ─────────────────────────────────────────── */}
                    {activeTab === "history" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Practice History</CardTitle>
                                <CardDescription>Your last {sessions.length} sessions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {sessions.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Mic className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p>No sessions yet. Start practicing to see your history!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sessions.map((s, i) => (
                                            <a
                                                key={s.id ?? i}
                                                href={s.id ? `/dashboard/session/${s.id}` : undefined}
                                                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-card transition-colors ${s.id ? "hover:bg-accent/5 hover:border-primary/30 cursor-pointer group" : ""}`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">Practice Session</span>
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            {Math.floor((s.duration ?? 0) / 60)}m {Math.floor((s.duration ?? 0) % 60)}s
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {(s.createdAt as any)?.toDate?.()?.toLocaleDateString() ?? "—"}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {(s.topics ?? []).slice(0, 3).map(t => (
                                                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                                                        ))}
                                                        {s.videoUrl && (
                                                            <Badge variant="outline" className="text-xs gap-1 border-blue-500/30 text-blue-500">
                                                                <Video className="w-3 h-3" /> Video
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 mt-3 sm:mt-0">
                                                    {s.id && (
                                                        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                                            View Report →
                                                        </span>
                                                    )}
                                                    <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-sm border-2 flex-shrink-0 ${(s.score ?? 0) >= 80 ? "border-green-500 text-green-500 bg-green-500/10" :
                                                        (s.score ?? 0) >= 60 ? "border-amber-500 text-amber-500 bg-amber-500/10" :
                                                            "border-red-500 text-red-500 bg-red-500/10"
                                                        }`}>{s.score ?? "—"}</div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Friends Tab ─────────────────────────────────────────── */}
                    {activeTab === "friends" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Friends</CardTitle>
                                <CardDescription>Users you mutually follow.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {friends.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p>No friends yet. Follow someone who follows you back!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {friends.map(f => (
                                            <div key={f.uid} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                                                <button onClick={() => router.push(`/dashboard/profile/${f.uid}`)} className="flex items-center gap-3 text-left">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={f.photoURL || ""} alt={f.displayName} />
                                                        <AvatarFallback>{(f.displayName?.[0] || "U").toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{f.displayName}</span>
                                                </button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled
                                                    className="gap-2 opacity-50 cursor-not-allowed"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    Practice Room
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Forum Activity Tab ──────────────────────────────────── */}
                    {activeTab === "forum" && (
                        <div className="space-y-6">
                            {/* My Posts */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />My Posts</CardTitle>
                                    <CardDescription>Posts you have authored in the forum</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {postsLoading ? (
                                        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}</div>
                                    ) : userPosts.length === 0 ? (
                                        <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
                                            <FileText className="w-10 h-10 opacity-30" />
                                            <p>You haven&apos;t posted anything yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {userPosts.map(post => (
                                                <a key={post.id} href={`/forum/${post.id}`} className="block p-4 rounded-xl border bg-card hover:bg-accent/5 hover:border-border/70 transition-all group">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{post.title}</h3>
                                                            {post.tags && post.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                    {post.tags.slice(0, 3).map(tag => (
                                                                        <span key={tag} className="text-[10px] font-medium bg-primary/5 text-primary/80 border border-primary/10 px-1.5 py-0.5 rounded">{tag}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground flex-shrink-0">{post.createdAt ? formatDate(post.createdAt.toDate()) : ""}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{post.likes ?? 0}</span>
                                                        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.commentCount ?? 0}</span>
                                                        <span className="flex items-center gap-1 ml-auto"><Eye className="w-3.5 h-3.5" />{post.viewCount ?? 0}</span>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* My Comments */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" />My Comments</CardTitle>
                                    <CardDescription>Posts you have commented on</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {commentedLoading ? (
                                        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />)}</div>
                                    ) : commentedPosts.length === 0 ? (
                                        <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
                                            <MessageSquare className="w-10 h-10 opacity-30" />
                                            <p>You haven&apos;t commented on any posts yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {commentedPosts.map(post => (
                                                <a key={post.id} href={`/forum/${post.id}`} className="block p-4 rounded-xl border bg-card hover:bg-accent/5 hover:border-border/70 transition-all group">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{post.title}</h3>
                                                            <div className="flex items-start gap-1.5 mt-2">
                                                                <CornerDownRight className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">&quot;{post.userComment}&quot;</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground flex-shrink-0">{post.createdAt ? formatDate(post.createdAt.toDate()) : ""}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{post.likes ?? 0}</span>
                                                        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.commentCount ?? 0}</span>
                                                        <span className="flex items-center gap-1 ml-auto"><Eye className="w-3.5 h-3.5" />{post.viewCount ?? 0}</span>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}

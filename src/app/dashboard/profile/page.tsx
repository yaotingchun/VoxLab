"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/contexts/FollowContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc, collection, collectionGroup, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Mail, Calendar, Clock, TrendingUp, Award, LogOut, Mic,
    Users, UserCheck, X, Flame, Trophy, History as HistoryIcon, Star, UserPlus, EyeOff, Video,
    MessageSquare, FileText, ThumbsUp, Eye, CornerDownRight, Pencil, Search, Target,
    BookOpen, Presentation as PresentationIcon, Home, ArrowLeft
} from "lucide-react";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { UserSearchModal } from "@/components/profile/UserSearchModal";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ProgressTrackerTab } from "@/components/profile/ProgressTrackerTab";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { UserProfile } from "@/components/ui/UserProfile";
import { SignOutModal } from "@/components/auth/SignOutModal";
import { Logo } from "@/components/ui/logo";
import { FollowEntry } from "@/lib/follow";
import { getUserBadges, BADGE_DEFINITIONS } from "@/lib/badges";
import { getRecentSessions } from "@/lib/sessions";
import { getUserStreak } from "@/lib/streak";
import { getFriends } from "@/lib/friends";
import { Post } from "@/types/forum";
import { PracticeSession } from "@/types/gamification";

// ─── Design Tokens ──────────────────────────────────────────────────────────
const GLASS_CARD = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 hover:bg-white/[0.05] transition-all duration-300";
const ICON_BOX = "p-2.5 rounded-2xl shadow-inner-white";

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
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
type Tab = "overview" | "history" | "friends" | "forum" | "tracker";

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading search params...</div>}>
            <ProfileContent />
        </Suspense>
    );
}

function ProfileContent() {
    const { user, loading, logout } = useAuth();
    const { followersCount, followingCount, followers, following, loadMyFollowData } = useFollow();
    const { profile: firestoreProfile } = useUserProfile();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [modal, setModal] = useState<"followers" | "following" | "badges" | "friends" | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

    // Gamification data
    const [streakCount, setStreakCount] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [badges, setBadges] = useState<Awaited<ReturnType<typeof getUserBadges>>>([]);
    const [sessions, setSessions] = useState<PracticeSession[]>([]);
    const [friends, setFriends] = useState<FollowEntry[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Privacy settings
    const [shareProgressTracker, setShareProgressTracker] = useState(false);
    const [shareHistory, setShareHistory] = useState(false);
    const [privacySaving, setPrivacySaving] = useState(false);

    // Forum activity
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsLoaded, setPostsLoaded] = useState(false);
    const [commentedPosts, setCommentedPosts] = useState<(Post & { userComment: string })[]>([]);
    const [commentedLoading, setCommentedLoading] = useState(false);
    const [commentedLoaded, setCommentedLoaded] = useState(false);
    const [showBadgeHover, setShowBadgeHover] = useState(false);
    const [showAllBadges, setShowAllBadges] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/");
    }, [user, loading, router]);

    useEffect(() => {
        const tab = searchParams.get("tab") as Tab;
        if (tab && ["overview", "history", "friends", "forum", "tracker"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        router.push(`/dashboard/profile?tab=${tab}`, { scroll: false });
    };

    useEffect(() => {
        if (user && !dataLoaded) {
            Promise.all([
                loadMyFollowData(),
                getUserStreak(user.uid).then(s => { if (s) { setStreakCount(s.currentStreak); setLongestStreak(s.longestStreak); } }),
                getUserBadges(user.uid).then(setBadges),
                getRecentSessions(user.uid, 100).then(setSessions),
                getFriends(user.uid).then(setFriends),
                getDoc(doc(db, "users", user.uid)).then(snap => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setShareProgressTracker(data?.shareProgressTracker ?? false);
                        setShareHistory(data?.shareHistory ?? false);
                    }
                })
            ]).then(() => setDataLoaded(true));
        }
    }, [user, dataLoaded, loadMyFollowData]);

    const handleToggleShareProgressTracker = async () => {
        if (!user || privacySaving) return;
        const newValue = !shareProgressTracker;
        setShareProgressTracker(newValue);
        setPrivacySaving(true);
        try {
            await setDoc(doc(db, "users", user.uid), { shareProgressTracker: newValue }, { merge: true });
        } catch (err) {
            console.error("Failed to save privacy setting:", err);
            setShareProgressTracker(!newValue);
        } finally {
            setPrivacySaving(false);
        }
    };

    const handleToggleShareHistory = async () => {
        if (!user || privacySaving) return;
        const newValue = !shareHistory;
        setShareHistory(newValue);
        setPrivacySaving(true);
        try {
            await setDoc(doc(db, "users", user.uid), { shareHistory: newValue }, { merge: true });
        } catch (err) {
            console.error("Failed to save privacy setting:", err);
            setShareHistory(!newValue);
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

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const earnedBadges = badges.filter(b => b.earned);
    const totalPracticeMinutes = Math.round(sessions.reduce((a, s) => a + (s.duration ?? 0), 0) / 60);
    const avgScore = sessions.length
        ? Math.round(sessions.reduce((a, s) => a + (s.score ?? (s as any).averageScore ?? 0), 0) / sessions.length)
        : 0;

    const TABS = [
        { id: "overview" as Tab, label: "Overview", icon: Star },
        { id: "forum" as Tab, label: "Forum Activity", icon: MessageSquare },
        { id: "tracker" as Tab, label: "Progress Tracker", icon: TrendingUp },
        { id: "history" as Tab, label: "History", icon: HistoryIcon }
    ];

    // Trigger lazy loads
    if (activeTab === "forum" && !postsLoaded && !postsLoading) loadUserPosts();
    if (activeTab === "forum" && !commentedLoaded && !commentedLoading) loadCommentedPosts();

    // Badge progress stats (used in overview)
    const badgeBestScore = sessions.reduce((best, s) => Math.max(best, s.score ?? (s as any).averageScore ?? 0), 0);
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

    return (
        <>
            {modal === "followers" && <FollowListModal title={`Followers (${followersCount})`} list={followers} onClose={() => setModal(null)} onNavigate={uid => router.push(`/dashboard/profile/${uid}`)} />}
            {modal === "following" && <FollowListModal title={`Following (${followingCount})`} list={following} onClose={() => setModal(null)} onNavigate={uid => router.push(`/dashboard/profile/${uid}`)} />}
            {modal === "friends" && <FollowListModal title={`Friends (${friends.length})`} list={friends} onClose={() => setModal(null)} onNavigate={uid => router.push(`/dashboard/profile/${uid}`)} description="Users who follow each other" />}
            {modal === "badges" && <BadgeListModal badges={earnedBadges} onClose={() => setModal(null)} />}
            {showEditModal && firestoreProfile && <EditProfileModal profile={firestoreProfile} onClose={() => setShowEditModal(false)} />}
            {showSearchModal && <UserSearchModal onClose={() => setShowSearchModal(false)} />}
            <SignOutModal
                isOpen={isSignOutModalOpen}
                onClose={() => setIsSignOutModalOpen(false)}
                onConfirm={async () => {
                    await logout();
                    setIsSignOutModalOpen(false);
                    router.push("/");
                }}
            />

            <header className="relative z-50 w-full bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-white hover:text-white hover:bg-white/10 transition-all rounded-xl bg-white/5 border border-white/10"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <Logo size="sm" className="opacity-80" />
                        <div className="h-4 w-[1px] bg-white/10" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Profile</span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-8">
                        <nav className="hidden lg:flex items-center gap-8 text-sm font-bold tracking-tight">
                            <button
                                onClick={() => router.push('/dashboard/mode')}
                                className="text-slate-400 hover:text-primary transition-all flex items-center gap-2 group"
                            >
                                Mode
                            </button>
                            <button
                                onClick={() => router.push('/forum')}
                                className="text-slate-400 hover:text-white transition-all flex items-center gap-2"
                            >
                                Forum
                            </button>
                        </nav>

                        <div className="h-8 w-px bg-white/10" />

                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/dashboard')}
                                className="text-slate-400 hover:text-white transition-all rounded-xl"
                            >
                                <Home className="w-5 h-5" />
                            </Button>
                            <NotificationDropdown />
                            {user && (
                                <UserProfile
                                    displayName={user.displayName || user.email?.split("@")[0] || "User"}
                                    photoURL={user.photoURL}
                                    onLogout={() => setIsSignOutModalOpen(true)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="min-h-screen bg-transparent p-6 md:p-10">
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
                        </div>
                    </div>

                    {/* Profile Hero Card */}
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
                                    <div className="relative group/avatar">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-110 group-hover/avatar:scale-125 transition-transform duration-500" />
                                        <Avatar className="h-32 w-32 border-4 border-white/10 ring-4 ring-primary/5 shadow-2xl relative">
                                            <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} className="object-cover" />
                                            <AvatarFallback className="text-5xl bg-gradient-to-br from-gray-800 to-gray-950 font-black text-white">
                                                {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/60">
                                                {user.displayName || "VoxLab User"}
                                            </h2>
                                            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                                                {firestoreProfile?.username && (
                                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono">
                                                        @{firestoreProfile.username}
                                                    </Badge>
                                                )}
                                                <Badge variant="secondary" className="bg-white/5 border-white/10 text-white/70">
                                                    {user.email}
                                                </Badge>
                                            </div>
                                        </div>

                                        {firestoreProfile?.bio && (
                                            <p className="text-base text-gray-300 leading-relaxed max-w-xl italic">
                                                "{firestoreProfile.bio}"
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-8 justify-center md:justify-start pt-2 text-center md:text-left">
                                            <button onClick={() => setModal("followers")} className="group/stat text-center">
                                                <p className="text-2xl font-black text-white group-hover/stat:text-primary transition-colors">{followersCount}</p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover/stat:text-primary/70">Followers</p>
                                            </button>
                                            <button onClick={() => setModal("following")} className="group/stat text-center">
                                                <p className="text-2xl font-black text-white group-hover/stat:text-primary transition-colors">{followingCount}</p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover/stat:text-primary/70">Following</p>
                                            </button>

                                            <button onClick={() => setModal("friends")} className="group/stat text-center">
                                                <p className="text-2xl font-black text-white group-hover/stat:text-primary transition-colors">{friends.length}</p>
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover/stat:text-primary/70">Friends</p>
                                            </button>

                                            <button
                                                className="cursor-pointer group/stat relative text-center"
                                                onClick={() => setModal("badges")}
                                            >
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
                                            { label: "Streak", value: streakCount, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" }
                                        ].map(s => (
                                            <div key={s.label} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3 hover:bg-white/10 transition-colors">
                                                <div className={`p-2 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                                                <div>
                                                    <p className="text-lg font-black leading-none">{s.value}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{s.label}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Tabs */}
                    <div className="flex gap-1 border-b text-white-50">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleTabChange(t.id)}
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

                    {/* Tab Content Area */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            {activeTab === "overview" && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                >
                                    {/* Streak Card */}
                                    <Card className={GLASS_CARD}>
                                        <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" />Streak</CardTitle></CardHeader>
                                        <CardContent className="space-y-4 text-center">
                                            <div className="flex items-center justify-around py-4">
                                                <div>
                                                    <p className="text-5xl font-black text-orange-500">{streakCount}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Current</p>
                                                </div>
                                                <div className="w-px h-16 bg-white/5" />
                                                <div>
                                                    <p className="text-5xl font-black text-purple-400">{longestStreak}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-2">Best</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-400 font-medium">Practice daily to maintain your growth!</p>
                                        </CardContent>
                                    </Card>

                                    {/* Account Quick Stats */}
                                    <Card className={GLASS_CARD}>
                                        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" />Account Activity</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Joined</p>
                                                    <p className="text-lg font-black">{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Verification</p>
                                                    <Badge variant={user.emailVerified ? "default" : "secondary"} className="mt-1">
                                                        {user.emailVerified ? "Verified" : "Pending"}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {/* Privacy Settings */}
                                            <div className="pt-4 border-t border-white/5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                                                        <TrendingUp className="w-4 h-4" />
                                                        <span>Share Progress Tracker</span>
                                                    </div>
                                                    <button
                                                        onClick={handleToggleShareProgressTracker}
                                                        disabled={privacySaving}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shareProgressTracker ? "bg-primary" : "bg-white/10"}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shareProgressTracker ? "translate-x-6" : "translate-x-1"}`} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                                                        <HistoryIcon className="w-4 h-4" />
                                                        <span>Share Practice History</span>
                                                    </div>
                                                    <button
                                                        onClick={handleToggleShareHistory}
                                                        disabled={privacySaving}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shareHistory ? "bg-primary" : "bg-white/10"}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shareHistory ? "translate-x-6" : "translate-x-1"}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            <Button variant="destructive" className="w-full mt-2 rounded-xl h-11 font-bold" onClick={async () => { await logout(); router.push("/"); }}>
                                                <LogOut className="w-4 h-4 mr-2" /> Sign Out
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {/* Achievements Summary */}
                                    <motion.div
                                        className="col-span-1 md:col-span-2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                    >
                                        <Card className={GLASS_CARD}>
                                            <CardHeader className="border-b border-white/5">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <CardTitle className="flex items-center gap-3 text-xl font-black">
                                                            <Trophy className="w-6 h-6 text-yellow-500" />
                                                            Achievements
                                                        </CardTitle>
                                                        <CardDescription className="text-gray-400 font-medium">
                                                            {earnedBadges.length} of {badges.length} goals achieved
                                                        </CardDescription>
                                                    </div>
                                                    <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                                        <span className="text-sm font-black text-yellow-500">
                                                            {Math.round((earnedBadges.length / badges.length) * 100)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-6">
                                                <AnimatePresence mode="wait">
                                                    {!showAllBadges ? (
                                                        <motion.div
                                                            key="summary"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="space-y-6"
                                                        >
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                                                {badges.slice(0, 10).map((b) => (
                                                                    <div key={b.id} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${b.earned ? "bg-white/5 border-white/10" : "bg-black/10 border-transparent opacity-30 grayscale"}`}>
                                                                        <span className="text-3xl">{b.icon}</span>
                                                                        <span className="text-[10px] font-black text-center uppercase tracking-tighter truncate w-full">{b.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <button
                                                                onClick={() => setShowAllBadges(true)}
                                                                className="w-full py-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 group"
                                                            >
                                                                <span>View More Badges</span>
                                                                <TrendingUp className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                            </button>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="detailed"
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="space-y-4"
                                                        >
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                {badges.map((b) => {
                                                                    const def = BADGE_DEFINITIONS.find(d => d.id === b.id);
                                                                    const prog = def ? def.progress(badgeLiveStats) : { current: b.earned ? 1 : 0, max: 1 };
                                                                    const pct = Math.min(100, Math.round((prog.current / prog.max) * 100));

                                                                    return (
                                                                        <div key={b.id} className={`p-4 rounded-2xl border transition-all ${b.earned ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-60"}`}>
                                                                            <div className="flex items-center gap-4">
                                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${RARITY_STYLES[b.rarity]}`}>
                                                                                    {b.icon}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="font-black text-white text-sm truncate">{b.name}</p>
                                                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{b.rarity}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-4 space-y-2">
                                                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                                                    <span className="text-gray-500">Progress</span>
                                                                                    <span className="text-white">{prog.current} / {prog.max}</span>
                                                                                </div>
                                                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                                    <motion.div
                                                                                        initial={{ width: 0 }}
                                                                                        animate={{ width: `${pct}%` }}
                                                                                        className={`h-full rounded-full bg-gradient-to-r from-primary to-purple-500`}
                                                                                    />
                                                                                </div>
                                                                                <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 font-medium">{b.description}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <button
                                                                onClick={() => setShowAllBadges(false)}
                                                                className="w-full py-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                                                            >
                                                                Show Less
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </motion.div>
                            )}

                            {activeTab === "forum" && (
                                <motion.div
                                    key="forum"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <Card className={GLASS_CARD}>
                                        <CardHeader className="border-b border-white/5">
                                            <CardTitle className="flex items-center gap-3 text-xl font-black">
                                                <FileText className="w-6 h-6 text-primary" />
                                                My Discussions
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            {postsLoading ? (
                                                <div className="space-y-4">
                                                    {[1, 2, 3].map(n => <div key={n} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
                                                </div>
                                            ) : userPosts.length === 0 ? (
                                                <div className="py-12 text-center text-gray-500">
                                                    <p className="font-bold">No posts created yet.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {userPosts.map(post => (
                                                        <Link key={post.id} href={`/forum/${post.id}`} className="block group">
                                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:bg-white/5 group-hover:border-primary/30 transition-all">
                                                                <h3 className="font-extrabold text-white group-hover:text-primary transition-colors line-clamp-1">{post.title}</h3>
                                                                <div className="flex items-center gap-4 mt-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                                    <span>{post.likes || 0} Likes</span>
                                                                    <span>{post.commentCount || 0} Comments</span>
                                                                    <span className="ml-auto">{post.createdAt ? formatDate((post.createdAt as any).toDate()) : "—"}</span>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className={GLASS_CARD}>
                                        <CardHeader className="border-b border-white/5">
                                            <CardTitle className="flex items-center gap-3 text-xl font-black">
                                                <MessageSquare className="w-6 h-6 text-primary" />
                                                Participation
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            {commentedLoading ? (
                                                <div className="space-y-4">
                                                    {[1, 2, 3].map(n => <div key={n} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
                                                </div>
                                            ) : commentedPosts.length === 0 ? (
                                                <div className="py-12 text-center text-gray-500">
                                                    <p className="font-bold">No community activity yet.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {commentedPosts.map(post => (
                                                        <Link key={post.id} href={`/forum/${post.id}`} className="block group">
                                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:bg-white/5 group-hover:border-primary/30 transition-all">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Commented On</p>
                                                                <h3 className="font-extrabold text-white group-hover:text-primary transition-colors line-clamp-1">{post.title}</h3>
                                                                <p className="mt-2 text-sm text-gray-400 italic line-clamp-1">"{post.userComment}"</p>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {activeTab === "tracker" && (
                                <motion.div
                                    key="tracker"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                >
                                    <ProgressTrackerTab sessions={sessions} />
                                </motion.div>
                            )}

                            {activeTab === "history" && (
                                <motion.div
                                    key="history"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <Card className={GLASS_CARD}>
                                        <CardHeader className="border-b border-white/5">
                                            <CardTitle className="flex items-center gap-3 text-xl font-black">
                                                <TrendingUp className="w-6 h-6 text-primary" />
                                                Recent Sessions
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            {sessions.length === 0 ? (
                                                <div className="py-20 text-center text-gray-500 bg-black/10 rounded-3xl border border-white/5">
                                                    <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                                    <p className="font-bold">No history yet</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {sessions.map((s, i) => (
                                                        <Link key={s.id ?? i} href={s.id ? `/dashboard/session/${s.id}` : "#"} className="block group">
                                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:bg-white/5 group-hover:border-primary/30 transition-all">
                                                                {(() => {
                                                                    const info = getModeInfo(s.mode);
                                                                    return (
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-12 h-12 rounded-xl ${info.bg} border border-white/5 flex items-center justify-center ${info.color} group-hover:scale-110 transition-transform`}>
                                                                                <info.icon className="w-6 h-6" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-extrabold text-white group-hover:text-primary transition-colors capitalize">{s.mode || "practice"} Session</p>
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{s.createdAt ? formatDate((s.createdAt as any).toDate()) : "—"}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
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
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </>
    );
}

// Internal Link helper to avoid router.push overhead for simple links
function Link({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    const router = useRouter();
    return (
        <a
            href={href}
            onClick={(e) => { e.preventDefault(); router.push(href); }}
            className={className}
        >
            {children}
        </a>
    );
}

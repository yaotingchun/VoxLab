"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/contexts/FollowContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Mail, Calendar, Clock, TrendingUp, Award, LogOut, Mic,
    Users, UserCheck, X, Flame, Trophy, History, Star, UserPlus
} from "lucide-react";
import { FollowEntry } from "@/lib/follow";
import { getUserBadges } from "@/lib/badges";
import { getRecentSessions } from "@/lib/sessions";
import { getStreak } from "@/lib/streaks";
import { getFriends } from "@/lib/friends";
import { inviteFriendToPractice } from "@/lib/friends";
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
type Tab = "overview" | "badges" | "history" | "friends";

export default function ProfilePage() {
    const { user, loading, logout } = useAuth();
    const { followersCount, followingCount, followers, following, loadMyFollowData } = useFollow();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [modal, setModal] = useState<"followers" | "following" | null>(null);

    // Gamification data
    const [streakCount, setStreakCount] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [badges, setBadges] = useState<Awaited<ReturnType<typeof getUserBadges>>>([]);
    const [sessions, setSessions] = useState<PracticeSession[]>([]);
    const [friends, setFriends] = useState<FollowEntry[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [invitingFriend, setInvitingFriend] = useState<string | null>(null);

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
                getFriends(user.uid).then(setFriends)
            ]).then(() => setDataLoaded(true));
        }
    }, [user, dataLoaded, loadMyFollowData]);

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const earnedBadges = badges.filter(b => b.earned);
    const totalPracticeMinutes = Math.round(sessions.reduce((a, s) => a + (s.duration ?? 0), 0) / 60);
    const avgScore = sessions.length
        ? Math.round(sessions.reduce((a, s) => a + (s.score ?? 0), 0) / sessions.length)
        : 0;

    const handleInviteFriend = async (friendUid: string, friendName: string) => {
        if (!user) return;
        setInvitingFriend(friendUid);
        try {
            const roomId = await inviteFriendToPractice(user.uid, user.displayName || "Someone", user.photoURL, friendUid);
            router.push(`/dashboard/practice/room/${roomId}`);
        } catch (e) {
            console.error("Invite failed:", e);
        } finally {
            setInvitingFriend(null);
        }
    };

    const TABS = [
        { id: "overview" as Tab, label: "Overview", icon: Star },
        { id: "badges" as Tab, label: `Badges (${earnedBadges.length})`, icon: Trophy },
        { id: "history" as Tab, label: "History", icon: History },
        { id: "friends" as Tab, label: `Friends (${friends.length})`, icon: Users }
    ];

    return (
        <>
            {modal === "followers" && <FollowListModal title={`Followers (${followersCount})`} list={followers} onClose={() => setModal(null)} onNavigate={uid => router.push(`/dashboard/profile/${uid}`)} />}
            {modal === "following" && <FollowListModal title={`Following (${followingCount})`} list={following} onClose={() => setModal(null)} onNavigate={uid => router.push(`/dashboard/profile/${uid}`)} />}

            <div className="min-h-screen bg-background p-6 md:p-10">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                            <p className="text-muted-foreground">Your journey, achievements, and community.</p>
                        </div>
                        <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
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
                                    <p className="text-sm text-muted-foreground">{user.email}</p>

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
                                        <div className="flex flex-col items-center">
                                            <span className="text-xl font-bold">{earnedBadges.length}</span>
                                            <span className="text-xs text-muted-foreground">Badges</span>
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

                            {/* Featured Badges */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" />Recent Badges</CardTitle>
                                    <CardDescription>
                                        {earnedBadges.length === 0 ? "Complete a session to earn your first badge!" : `${earnedBadges.length} / ${badges.length} earned`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {earnedBadges.length === 0 ? (
                                        <div className="text-center py-4 text-4xl">🔒</div>
                                    ) : (
                                        <div className="flex flex-wrap gap-3">
                                            {earnedBadges.slice(0, 6).map(b => (
                                                <div key={b.id} title={`${b.name}: ${b.description}`}
                                                    className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border ${RARITY_STYLES[b.rarity]} ${RARITY_GLOW[b.rarity]} cursor-default`}>
                                                    <span className="text-2xl">{b.icon}</span>
                                                </div>
                                            ))}
                                            {earnedBadges.length > 6 && (
                                                <button onClick={() => setActiveTab("badges")}
                                                    className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border border-dashed text-muted-foreground hover:text-primary hover:border-primary transition-colors text-xs font-medium">
                                                    +{earnedBadges.length - 6}
                                                </button>
                                            )}
                                        </div>
                                    )}
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
                                    <Button variant="destructive" className="w-full mt-2" onClick={async () => { await logout(); router.push("/"); }}>
                                        <LogOut className="w-4 h-4 mr-2" />Sign Out
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ── Badges Tab ──────────────────────────────────────────── */}
                    {activeTab === "badges" && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {badges.map(b => (
                                <div key={b.id}
                                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${b.earned
                                            ? `${RARITY_STYLES[b.rarity]} ${RARITY_GLOW[b.rarity]}`
                                            : "border-slate-800 bg-slate-900/30 opacity-40 grayscale"
                                        }`}
                                >
                                    {b.earned && (
                                        <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${b.rarity === "legendary" ? "bg-yellow-500/20 text-yellow-400" :
                                                b.rarity === "epic" ? "bg-purple-500/20 text-purple-400" :
                                                    b.rarity === "rare" ? "bg-blue-500/20 text-blue-400" :
                                                        "bg-slate-500/20 text-slate-400"
                                            }`}>{b.rarity}</span>
                                    )}
                                    <span className="text-4xl">{b.icon}</span>
                                    <p className="text-sm font-semibold text-center leading-tight">{b.name}</p>
                                    <p className="text-xs text-muted-foreground text-center leading-tight">{b.description}</p>
                                    {!b.earned && <span className="text-xs text-muted-foreground">🔒 Locked</span>}
                                </div>
                            ))}
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
                                            <div key={s.id ?? i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">Practice Session</span>
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            {Math.round((s.duration ?? 0) / 60)}m {(s.duration ?? 0) % 60}s
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
                                                    </div>
                                                </div>
                                                <div className={`flex items-center justify-center mt-3 sm:mt-0 w-12 h-12 rounded-full font-bold text-sm border-2 flex-shrink-0 ${(s.score ?? 0) >= 80 ? "border-green-500 text-green-500 bg-green-500/10" :
                                                        (s.score ?? 0) >= 60 ? "border-amber-500 text-amber-500 bg-amber-500/10" :
                                                            "border-red-500 text-red-500 bg-red-500/10"
                                                    }`}>{s.score ?? "—"}</div>
                                            </div>
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
                                <CardDescription>Users you mutually follow. Invite them to a practice room!</CardDescription>
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
                                                    disabled={invitingFriend === f.uid}
                                                    onClick={() => handleInviteFriend(f.uid, f.displayName)}
                                                    className="gap-2"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    {invitingFriend === f.uid ? "Inviting..." : "Invite to Practice"}
                                                </Button>
                                            </div>
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

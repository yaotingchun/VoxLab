"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    Mic,
    Sparkles,
    Video,
    Briefcase,
    Flame,
    Calendar,
    Clock,
    Star,
    TrendingUp,
    LogOut,
    User,
    MessageSquare,
    ChevronRight,
    Play,
    Bell,
    Zap,
    Layout,
    Activity,
    BookOpen,
    Users,
    Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getRecentSessions, getSessionStats } from "@/lib/sessions";
import { getUserStreak } from "@/lib/streak";
import { PracticeSession } from "@/types/gamification";
import { SignOutModal } from "@/components/auth/SignOutModal";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";
import { Logo } from "@/components/ui/logo";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { UserProfile } from "@/components/ui/UserProfile";
import { SpeakerStickman } from "@/components/ui/speaker-stickman";

export default function DashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [recentSessions, setRecentSessions] = useState<PracticeSession[]>([]);
    const [stats, setStats] = useState({ sessionsCount: 0, totalPracticeSeconds: 0, bestScore: 0 });
    const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
    const [dataLoading, setDataLoading] = useState(true);
    const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        async function fetchData() {
            if (user) {
                try {
                    const [sessions, userStats, streakData] = await Promise.all([
                        getRecentSessions(user.uid, 5),
                        getSessionStats(user.uid),
                        getUserStreak(user.uid)
                    ]);
                    setRecentSessions(sessions);
                    setStats(userStats);
                    if (streakData) setStreak(streakData);
                } catch (e) {
                    console.error("Failed to fetch dashboard data:", e);
                } finally {
                    setDataLoading(false);
                }
            }
        }
        fetchData();
    }, [user]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }, []);

    const userDisplayName = user?.displayName || user?.email?.split('@')[0] || "Speaker";

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!user) return null;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const statsCards = [
        { label: "Practice Streak", value: `${streak.currentStreak} Days`, icon: <Flame className="w-5 h-5 text-orange-500" />, color: "bg-orange-500/10 border-orange-500/20" },
        { label: "History", value: `${stats.sessionsCount} Sessions`, icon: <Calendar className="w-5 h-5 text-blue-500" />, color: "bg-blue-500/10 border-blue-500/20" },
        { label: "Practice Time", value: `${Math.round(stats.totalPracticeSeconds / 60)}m`, icon: <Clock className="w-5 h-5 text-purple-500" />, color: "bg-purple-500/10 border-purple-500/20" },
        { label: "Elite Score", value: `${stats.bestScore}%`, icon: <Star className="w-5 h-5 text-yellow-500" />, color: "bg-yellow-500/10 border-yellow-500/20" },
    ];

    const tiers = {
        hero: {
            title: "Practice Mode",
            desc: "The core VoxLab experience. AI-guided speech training with real-time feedback on your voice, content, and body language.",
            icon: <Play className="w-8 h-8" />,
            route: "/dashboard/practice/topic",
            cta: "Start New Session"
        },
        labs: [
            {
                title: "Presentation Lab",
                desc: "Practice with your own slides.",
                icon: <Layout className="w-6 h-6" />,
                route: "/dashboard/presentation/setup",
                color: "emerald"
            },
            {
                title: "Interview Lab",
                desc: "Mock behavioral interviews.",
                icon: <Briefcase className="w-6 h-6" />,
                route: "/dashboard/interview",
                color: "purple"
            },
            {
                title: "Lecture Lab",
                desc: "Refine your teaching style.",
                icon: <BookOpen className="w-6 h-6" />,
                route: "/dashboard/practice/topic?mode=lecture",
                color: "blue"
            }
        ],
        plus: [
            {
                title: "Vocal+",
                icon: (
                    <div className="w-10 h-10 flex items-center justify-center text-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                            <line x1="8" y1="22" x2="16" y2="22" />
                            {/* Grill lines */}
                            <line x1="10" y1="5" x2="14" y2="5" opacity="0.5" />
                            <line x1="10" y1="8" x2="14" y2="8" opacity="0.5" />
                            <line x1="10" y1="11" x2="14" y2="11" opacity="0.5" />
                        </svg>
                    </div>
                ),
                route: "/speech-coach",
                label: "Pure Voice Analysis"
            },
            {
                title: "Posture+",
                icon: (
                    <div className="w-10 h-10 flex items-center justify-center text-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                            {/* Stickman head */}
                            <circle cx="12" cy="7" r="2.5" />
                            {/* Body and limbs */}
                            <path d="M12 10v6" />
                            <path d="M12 11l-3 2" />
                            <path d="M12 11l3 2" />
                            <path d="M10 21l2-5 2 5" />
                            {/* Wavy interaction lines like the reference */}
                            <motion.path
                                d="M6 10q-2 2 0 4"
                                animate={{ x: [-1, 1, -1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />
                            <motion.path
                                d="M18 10q 2 2 0 4"
                                animate={{ x: [1, -1, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />
                        </svg>
                    </div>
                ),
                route: "/analysis",
                label: "Pure Visual Presence"
            },
            {
                title: "Content+",
                icon: (
                    <div className="w-10 h-10 flex items-center justify-center text-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            <path d="M13 11a1.5 1.5 0 0 0 0-3" strokeOpacity="0.5" />
                            <path d="M13 7a4 4 0 0 0 0 8" strokeOpacity="0.5" />
                            {/* Second Bubble outline skeleton */}
                            <path d="M17 19v2l-2-2" opacity="0.4" />
                        </svg>
                    </div>
                ),
                route: "/dashboard/coach",
                label: "Pure Speech Data"
            },
        ]
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-primary/30">
            <UnifiedHeader isDashboard />

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-12">
                {/* Hero section */}
                <section className="space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                                <span className="text-xs font-bold text-secondary uppercase tracking-[0.2em]">Next Practice Scheduled</span>
                            </div>
                            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
                                {greeting}, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">{userDisplayName}</span>
                            </h1>
                        </div>

                        {/* Summary Stats Row */}
                        <div className="flex gap-4">
                            {statsCards.slice(0, 2).map((stat, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 min-w-[140px]">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
                                    <div className="text-xl font-bold flex items-center gap-2">
                                        {stat.icon} {stat.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </section>

                {/* Tier 1: Plus Modules (Utilities) - MOVED UP */}
                <section className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {tiers.plus.map((item, i) => (
                            <motion.button
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => router.push(item.route)}
                                className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/10 backdrop-blur-xl border border-white/20 hover:border-primary/50 hover:bg-white/15 transition-all group shadow-2xl"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-white/5 rounded-xl group-hover:text-primary transition-colors">
                                        {item.icon}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-base leading-none mb-1 flex items-center gap-1.5">
                                            {item.title}
                                            <span className="text-[7px] bg-primary/20 text-primary px-1.5 py-0.5 rounded italic font-black">PRO</span>
                                        </div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{item.label}</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-primary" />
                            </motion.button>
                        ))}
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: PRACTICE & LABS */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* MAIN HERO CARD: PRACTICE MODE (RESIZED & BALANCED) */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative group cursor-pointer"
                            onClick={() => router.push(tiers.hero.route)}
                        >
                            <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/40 to-secondary/40 rounded-[2rem] opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
                            <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-12 lg:h-[400px] flex flex-col md:flex-row items-center justify-between gap-8 group-hover:bg-white/[0.05] group-hover:border-primary/30 transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                                {/* Content */}
                                <div className="relative z-10 flex-1 space-y-6">
                                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Main Experience
                                    </div>
                                    <div className="space-y-3">
                                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none group-hover:text-white transition-colors">
                                            {tiers.hero.title}
                                        </h2>
                                        <p className="text-slate-400 text-base leading-relaxed max-w-md">
                                            {tiers.hero.desc}
                                        </p>
                                    </div>
                                    <Button size="lg" className="h-14 px-6 rounded-xl bg-white text-black hover:bg-white/90 text-base font-bold transition-all">
                                        {tiers.hero.cta}
                                        <Play className="ml-2 w-4 h-4 fill-black" />
                                    </Button>
                                </div>

                                {/* Visual - Public Speaking Stickman Logo */}
                                <div className="relative flex-shrink-0 w-64 md:w-72 lg:w-80 aspect-square flex items-center justify-center">
                                    <SpeakerStickman />
                                </div>
                            </div>
                        </motion.div>

                        {/* Pro Lab Extensions */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {tiers.labs.map((lab, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    whileHover={{ y: -5 }}
                                    onClick={() => router.push(lab.route)}
                                    className="group relative cursor-pointer"
                                >
                                    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 h-full flex flex-col justify-between items-start gap-8 group-hover:bg-white/[0.05] group-hover:border-white/20 transition-all duration-500 shadow-lg">
                                        <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform duration-500">
                                            {lab.icon}
                                        </div>
                                        <div className="space-y-2 w-full">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
                                                    {lab.title}
                                                </h4>
                                                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all shrink-0">
                                                    <ChevronRight className="w-3 h-3" />
                                                </div>
                                            </div>
                                            <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                                                {lab.desc}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: HISTORY & COMMUNITY */}
                    <div className="space-y-8">
                        {/* Activity Feed */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white/[0.01] border border-white/5 rounded-[1.5rem] p-6 space-y-6 lg:h-[400px] flex flex-col"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg tracking-tight">Recent Sessions</h3>
                                <button onClick={() => router.push('/dashboard/profile')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest transition-colors">View All</button>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                {dataLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="animate-pulse flex items-center gap-4 h-14 bg-white/5 rounded-xl" />
                                    ))
                                ) : recentSessions.length > 0 ? (
                                    recentSessions.map((session, i) => (
                                        <button
                                            key={i}
                                            onClick={() => router.push(`/dashboard/session/${session.id}`)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-transparent hover:border-white/5 hover:bg-white/[0.04] transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center font-black text-[10px] text-primary group-hover:scale-110 transition-transform">
                                                    {session.score}%
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-xs tracking-tight line-clamp-1">{session.topics?.[0] || "General Practice"}</div>
                                                    <div className="text-[9px] text-slate-600 uppercase font-bold">{session.createdAt?.toDate ? session.createdAt.toDate().toLocaleDateString() : 'Just now'}</div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-slate-800 group-hover:text-white transition-colors" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl h-full flex flex-col items-center justify-center">
                                        <Clock className="w-6 h-6 text-slate-700 mb-2" />
                                        <p className="text-slate-500 text-xs">No activity yet.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Speaker's Collective Shortcut (Smaller) */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gradient-to-br from-primary/10 to-transparent border border-white/5 rounded-[1.5rem] p-6 space-y-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-xl">
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="text-lg font-black tracking-tight italic">Collective</h3>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Join our global community of speakers and share your progress.
                            </p>
                            <Button variant="ghost" className="w-full h-10 rounded-xl border border-primary/20 hover:bg-primary/10 text-primary font-bold text-xs transition-all" onClick={() => router.push('/forum')}>
                                Enter Forum
                                <ChevronRight className="ml-2 w-3 h-3" />
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* Logout Confirmation */}
            <SignOutModal
                isOpen={isSignOutModalOpen}
                onClose={() => setIsSignOutModalOpen(false)}
                onConfirm={() => {
                    logout();
                    setIsSignOutModalOpen(false);
                }}
            />
        </div>
    );
}
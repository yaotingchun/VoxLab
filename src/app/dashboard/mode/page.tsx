"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Zap,
    Briefcase,
    Presentation,
    BookOpen
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/ui/UserProfile";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const modes = [
    {
        id: "practice",
        title: "Practice Mode",
        description: "Sharpen your skills with AI-driven real-time feedback on any topic.",
        icon: <Zap className="w-8 h-8" />,
        color: "from-purple-600/20 to-indigo-600/20",
        border: "border-purple-500/20",
        iconColor: "text-purple-400",
        href: "/dashboard/practice/topic"
    },
    {
        id: "interview",
        title: "Interview Lab",
        description: "Master high-stakes interviews with industry-specific mock sessions.",
        icon: <Briefcase className="w-8 h-8" />,
        color: "from-blue-600/20 to-cyan-600/20",
        border: "border-blue-500/20",
        iconColor: "text-blue-400",
        href: "/dashboard/interview"
    },
    {
        id: "presentation",
        title: "Presentation Setup",
        description: "Upload your slides and get coached on your delivery and structure.",
        icon: <Presentation className="w-8 h-8" />,
        color: "from-amber-600/20 to-orange-600/20",
        border: "border-amber-500/20",
        iconColor: "text-amber-400",
        href: "/dashboard/presentation/setup"
    },
    {
        id: "lecture",
        title: "Lecture Lab",
        description: "Perfect your academic or educational delivery with AI lecture analysis.",
        icon: <BookOpen className="w-8 h-8" />,
        color: "from-emerald-600/20 to-teal-600/20",
        border: "border-emerald-500/20",
        iconColor: "text-emerald-400",
        href: "/dashboard/practice/topic?mode=lecture"
    }
];

export default function ModeSelectionPage() {
    const router = useRouter();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
            {/* Header */}
            <header className="relative z-50 w-full bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50">
                <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Mode</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard/mode')}
                            className="text-white flex items-center gap-2 text-sm font-medium"
                        >
                            Mode
                        </button>
                        <button
                            onClick={() => router.push('/forum')}
                            className="text-slate-400 hover:text-primary transition-all flex items-center gap-2 text-sm font-medium"
                        >
                            Forum
                        </button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/dashboard')}
                            className="text-white/50 hover:text-primary hover:bg-primary/10 transition-all rounded-xl"
                            title="Dashboard"
                        >
                            <Home className="w-5 h-5" />
                        </Button>
                        <NotificationDropdown />
                        {user && <UserProfile displayName={user.displayName || user.email?.split("@")[0] || "User"} />}
                    </div>
                </div>
            </header>

            <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 relative z-10">

                <div className="space-y-4 text-center md:text-left">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white italic underline decoration-primary/50 underline-offset-8">
                        SELECT MODE
                    </h1>
                    <p className="text-slate-400 max-w-2xl text-lg">
                        Choose your training ground. Each mode is optimized for specific speaking scenarios.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                    {modes.map((mode, index) => (
                        <motion.div
                            key={mode.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                            onClick={() => router.push(mode.href)}
                            className={`group relative p-8 rounded-[2rem] border ${mode.border} bg-black/40 backdrop-blur-xl cursor-pointer overflow-hidden transition-all hover:shadow-2xl hover:shadow-white/5`}
                        >
                            {/* Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                            <div className="relative z-10 space-y-6">
                                <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center ${mode.iconColor} group-hover:scale-110 transition-transform duration-500`}>
                                    {mode.icon}
                                </div>
                                <div className="space-y-2 mt-4">
                                    <h3 className="text-2xl font-black text-white tracking-tight">{mode.title}</h3>
                                    <p className="text-slate-400 leading-relaxed font-medium">
                                        {mode.description}
                                    </p>
                                </div>
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                                <span className="text-8xl font-black italic select-none">0{index + 1}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

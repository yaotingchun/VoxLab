"use client";
import { PresentationCoach } from "@/components/analysis/PresentationCoach";
import { Logo } from "@/components/ui/logo";
import { Home, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { UserProfile } from "@/components/ui/UserProfile";
import { useAuth } from "@/contexts/AuthContext";

export default function AnalysisPage() {
    const { user } = useAuth();
    const router = useRouter();

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 overflow-x-hidden">

            {/* Header */}
            <header className="glass-header relative z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-white hover:text-white hover:bg-white/10 transition-all rounded-xl bg-white/5 border border-white/10"
                            title="Go Back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <Logo size="lg" />
                        <div className="h-6 w-[1px] bg-slate-800 mx-1" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Analysis</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/dashboard')}
                            className="text-slate-400 hover:text-primary hover:bg-primary/10 transition-all rounded-xl"
                        >
                            <Home className="w-5 h-5" />
                        </Button>
                        <NotificationDropdown />
                        {user && <UserProfile displayName={user.displayName || user.email?.split("@")[0] || "User"} />}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 py-12 px-6 max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI visual Analysis
                    </div>
                    <h1 className="text-5xl font-black tracking-tight leading-none">
                        Holistic Presentation <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Analysis</span>
                    </h1>
                    <p className="text-slate-400 text-base max-w-2xl mx-auto">
                        Real-time feedback on your <strong>Posture</strong>, <strong>Expression</strong>, and <strong>Eye Contact</strong>.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <PresentationCoach />
                </div>
            </main>
        </div>
    );
}

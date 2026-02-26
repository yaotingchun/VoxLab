"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import PresentationSetup from "@/components/presentation/PresentationSetup";
import { Logo } from "@/components/ui/logo";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/ui/UserProfile";
import { useAuth } from "@/contexts/AuthContext";

export default function PresentationSetupPage() {
    const { user } = useAuth();
    const router = useRouter();

    const handleStart = (slideData: { file: File; base64: string }, rubricData?: { file: File; base64: string }) => {
        // Save to sessionStorage before redirecting
        sessionStorage.setItem("presentation_slide_b64", slideData.base64);
        sessionStorage.setItem("presentation_slide_type", slideData.file.type || "application/pdf");
        sessionStorage.setItem("presentation_slide_name", slideData.file.name || "slides.pdf");

        if (rubricData) {
            sessionStorage.setItem("presentation_rubric_b64", rubricData.base64);
            sessionStorage.setItem("presentation_rubric_type", rubricData.file.type || "application/pdf");
            sessionStorage.setItem("presentation_rubric_name", rubricData.file.name || "rubric.pdf");
        } else {
            sessionStorage.removeItem("presentation_rubric_b64");
            sessionStorage.removeItem("presentation_rubric_type");
            sessionStorage.removeItem("presentation_rubric_name");
        }

        router.push("/dashboard/presentation");
    };

    return (
        <div className="relative min-h-screen bg-transparent text-white">

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
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Presentation</span>
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
                                title="Dashboard"
                            >
                                <Home className="w-5 h-5" />
                            </Button>
                            <NotificationDropdown />
                            {user && <UserProfile displayName={user.displayName || user.email?.split("@")[0] || "User"} />}
                        </div>
                    </div>
                </div>
            </header>

            <PresentationSetup onStart={handleStart} />
        </div>
    );
}

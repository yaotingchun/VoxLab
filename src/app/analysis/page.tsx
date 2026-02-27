"use client";
import { PresentationCoach } from "@/components/analysis/PresentationCoach";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";

export default function AnalysisPage() {
    const { user } = useAuth();
    const router = useRouter();

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 overflow-x-hidden">

            <UnifiedHeader
                section="Analysis"
                backButton={{
                    href: "/dashboard",
                    label: "Back to Dashboard"
                }}
            />

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

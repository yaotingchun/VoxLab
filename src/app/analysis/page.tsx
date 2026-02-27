"use client";
import { PresentationCoach } from "@/components/analysis/PresentationCoach";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";

export default function AnalysisPage() {
    return (
        <div className="flex flex-col h-screen bg-transparent text-white overflow-hidden">

            <UnifiedHeader
                section="Analysis"
                backButton={{
                    href: "/dashboard",
                    label: "Go Back"
                }}
            />

            {/* Main Content */}
            <div className="flex-1 min-h-0 p-4">
                <PresentationCoach />
            </div>
        </div>
    );
}

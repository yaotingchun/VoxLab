"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PresentationSetup from "@/components/presentation/PresentationSetup";

export default function PresentationSetupPage() {
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
        <div className="relative">
            {/* Back Button */}
            <div className="fixed top-6 left-6 z-50">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Dashboard
                </button>
            </div>

            <PresentationSetup onStart={handleStart} />
        </div>
    );
}

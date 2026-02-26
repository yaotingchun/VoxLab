"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PresentationSetup from "@/components/presentation/PresentationSetup";
import { usePracticeStore } from "@/store/practiceStore";

export default function PresentationSetupPage() {
    const router = useRouter();
    const setPresentationSlide = usePracticeStore((state) => state.setPresentationSlide);
    const setPresentationRubric = usePracticeStore((state) => state.setPresentationRubric);

    const handleStart = (slideData: { file: File; base64: string }, rubricData?: { file: File; base64: string }) => {
        // Save to Zustand store before redirecting
        setPresentationSlide({
            base64: slideData.base64,
            type: slideData.file.type || "application/pdf",
            name: slideData.file.name || "slides.pdf"
        });

        if (rubricData) {
            setPresentationRubric({
                base64: rubricData.base64,
                type: rubricData.file.type || "application/pdf",
                name: rubricData.file.name || "rubric.pdf"
            });
        } else {
            setPresentationRubric(null);
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

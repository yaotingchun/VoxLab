"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PresentationSetup from "@/components/presentation/PresentationSetup";
import { usePracticeStore } from "@/store/practiceStore";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";

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
        <div className="relative min-h-screen bg-transparent text-white">

            <UnifiedHeader
                section="Presentation"
                backButton={{
                    href: "/dashboard",
                    label: "Back to Dashboard"
                }}
            />

            <PresentationSetup onStart={handleStart} />

        </div>
    );
}

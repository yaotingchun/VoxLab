"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import PresentationSetup from "@/components/presentation/PresentationSetup";
import { usePracticeStore } from "@/store/practiceStore";
import { Logo } from "@/components/ui/logo";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/ui/UserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { SignOutModal } from "@/components/auth/SignOutModal";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";
import { useState } from "react";

export default function PresentationSetupPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
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

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import PresentationSetup from "@/components/presentation/PresentationSetup";
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

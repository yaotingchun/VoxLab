"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    Home,
    ArrowLeft,
    LogOut,
    MessageSquare,
    Layout,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { UserProfile } from "@/components/ui/UserProfile";
import { SignOutModal } from "@/components/auth/SignOutModal";
import Link from "next/link";

interface UnifiedHeaderProps {
    section?: string;
    backButton?: {
        href: string;
        label: string;
    };
    isDashboard?: boolean;
    onBackOverride?: () => void;
    rightContent?: React.ReactNode;
}

export function UnifiedHeader({ section, backButton, isDashboard = false, onBackOverride, rightContent }: UnifiedHeaderProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

    const userDisplayName = user?.displayName || user?.email?.split('@')[0] || "Speaker";

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Left: Logo & Section / Back Button */}
                <div className="flex items-center gap-4">
                    {backButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (onBackOverride) {
                                    onBackOverride();
                                } else if (backButton.href) {
                                    router.push(backButton.href);
                                }
                            }}
                            className="text-white hover:text-white hover:bg-white/10 transition-all rounded-xl bg-white/5 border border-white/10 shrink-0"
                            title={backButton.label}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}

                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <Logo size="lg" />
                        </Link>
                        {section && (
                            <>
                                <div className="h-6 w-[1px] bg-white/10 mx-1" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">{section}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Navigation & User Actions */}
                <div className="flex items-center gap-4 sm:gap-8">
                    {rightContent}
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
                            className={`transition-all rounded-xl ${isDashboard
                                ? "text-primary bg-primary/10 border border-primary/30 shadow-[0_0_20px_rgba(109,40,217,0.3)]"
                                : "text-slate-400 hover:text-white"
                                }`}
                            title="Dashboard"
                        >
                            <Home className="w-5 h-5" />
                        </Button>

                        <NotificationDropdown />

                        {user && (
                            <UserProfile
                                displayName={userDisplayName}
                                photoURL={user.photoURL}
                                onLogout={() => setIsSignOutModalOpen(true)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Logout Confirmation */}
            <SignOutModal
                isOpen={isSignOutModalOpen}
                onClose={() => setIsSignOutModalOpen(false)}
                onConfirm={() => {
                    logout();
                    setIsSignOutModalOpen(false);
                }}
            />
        </header>
    );
}

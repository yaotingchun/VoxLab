"use client";

import { X, Power } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function SignOutModal({ isOpen, onClose, onConfirm }: SignOutModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-sm p-6 overflow-hidden rounded-3xl border border-white/10 bg-black/90 backdrop-blur-2xl shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Inner Highlight */}
                <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl ring-1 ring-inset ring-white/10" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                <div className="flex flex-col items-center text-center space-y-4 mb-6">
                    <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                        <Power className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold tracking-tight text-white">
                            Sign Out
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to sign out of your account?
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 border-white/10 hover:bg-white/5"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={onConfirm}
                    >
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
}

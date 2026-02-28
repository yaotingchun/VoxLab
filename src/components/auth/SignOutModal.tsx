"use client";

import { X, Power } from "lucide-react";

interface SignOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function SignOutModal({ isOpen, onClose, onConfirm }: SignOutModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-[400px] p-8 overflow-hidden rounded-[32px] border border-white/5 bg-[#0a0a0a] shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 transition-colors z-10 text-slate-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center space-y-5 mb-8 mt-2">
                    <div className="p-4 rounded-full bg-[#130b29] ring-1 ring-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)] flex items-center justify-center">
                        <Power className="w-8 h-8 text-[#8b5cf6] stroke-[2.5]" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                            Sign Out
                        </h2>
                        <p className="text-[15px] font-medium text-slate-300">
                            Are you sure you want to sign out of your account?
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 w-full">
                    <button
                        className="flex-1 py-3.5 px-4 rounded-full border border-white/10 font-semibold text-white hover:bg-white/5 transition-colors"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="flex-1 py-3.5 px-4 rounded-full bg-[#8b5cf6] hover:bg-[#7c3aed] font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all"
                        onClick={onConfirm}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

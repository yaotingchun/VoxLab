"use client";

import { usePathname } from "next/navigation";
import { AbstractMic } from "./abstract-mic";

export function GlobalBackground() {
    const pathname = usePathname();

    // Hide on landing page
    if (pathname === "/") return null;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
            {/* Ambient Landing-Style Pulse Backgrounds */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/15 rounded-full blur-[140px] animate-pulse-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-secondary/15 rounded-full blur-[140px]" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

            {/* Live Microphone Background (Vivid Cyber Waves) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] scale-[1.1] pointer-events-none filter brightness-125 contrast-125">
                <AbstractMic showWaves={true} />
            </div>
        </div>
    );
}

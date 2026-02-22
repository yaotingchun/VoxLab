"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Practice Room — coming soon.
 * This page is reserved for future implementation.
 */
export default function PracticeRoomPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
            <div className="text-center space-y-3 max-w-sm">
                <p className="text-4xl">🚧</p>
                <h1 className="text-xl font-bold">Practice Room — Coming Soon</h1>
                <p className="text-muted-foreground text-sm">
                    This feature is under development. Check back later!
                </p>
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}

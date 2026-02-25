"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ProgressTrackerPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard/profile?tab=tracker");
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-bold">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p>Moving to Profile Dashboard...</p>
        </div>
    );
}

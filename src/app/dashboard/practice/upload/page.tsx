"use client";

import { LocalVideoProcessor } from "@/components/analysis/LocalVideoProcessor";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PracticeUploadPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen bg-[#070b14] text-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 text-sm transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            Upload Practice Video
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Upload a pre-recorded presentation or speech for AI analysis.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl">
                    <LocalVideoProcessor onComplete={(sessionId) => {
                        // Redirect to the newly created session for review
                        router.push(`/dashboard/session/${sessionId}`);
                    }} />
                </div>
            </div>
        </div>
    );
}

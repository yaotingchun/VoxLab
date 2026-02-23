"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Sparkles, Video, Briefcase } from "lucide-react";

export default function DashboardPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                            Logged in as: <span className="text-foreground font-medium">{user.email}</span>
                        </span>
                        <Button variant="outline" onClick={() => router.push('/dashboard/profile')}>
                            My Profile
                        </Button>
                        <Button variant="ghost" onClick={() => logout()}>
                            Logout
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="group relative rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden p-6" onClick={() => router.push('/dashboard/coach')}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles className="w-12 h-12" />
                        </div>
                        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                            <Mic className="w-4 h-4 text-primary" />
                            AI Coach
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Practice your speech with real-time AI feedback.
                        </p>
                    </div>

                    <div className="group relative rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden p-6" onClick={() => router.push('/dashboard/practice/topic')}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Video className="w-12 h-12" />
                        </div>
                        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                            <Video className="w-4 h-4 text-blue-400" />
                            Practice Session
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Choose a topic and start a full practice session with posture, voice, and speech analysis.
                        </p>
                    </div>
                    <div className="group relative rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden p-6" onClick={() => router.push('/dashboard/interview')}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Briefcase className="w-12 h-12" />
                        </div>
                        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-emerald-400" />
                            Interview Mode
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Upload your resume & job description for a realistic AI mock interview with feedback.
                        </p>
                    </div>
                    <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => router.push('/dashboard/profile')}>
                        <h3 className="font-semibold leading-none tracking-tight">Recent Activity</h3>
                        <p className="text-sm text-muted-foreground mt-2">No recent activity.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

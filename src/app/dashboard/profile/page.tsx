"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    User,
    Mail,
    Calendar,
    Clock,
    TrendingUp,
    Award,
    LogOut,
    Mic
} from "lucide-react";

// Mock Data for Profile
const MOCK_STATS = [
    {
        label: "Total Sessions",
        value: "12",
        icon: Mic,
        color: "text-blue-500",
        bg: "bg-blue-500/10"
    },
    {
        label: "Average Score",
        value: "78%",
        icon: Award,
        color: "text-amber-500",
        bg: "bg-amber-500/10"
    },
    {
        label: "Practice Time",
        value: "4h 20m",
        icon: Clock,
        color: "text-green-500",
        bg: "bg-green-500/10"
    }
];

const MOCK_HISTORY = [
    {
        id: 1,
        date: "Today, 10:30 AM",
        duration: "5m 20s",
        score: 85,
        topics: ["Pacing", "Eye Contact"]
    },
    {
        id: 2,
        date: "Yesterday, 2:15 PM",
        duration: "3m 45s",
        score: 72,
        topics: ["Filler Words"]
    },
    {
        id: 3,
        date: "Feb 15, 2026",
        duration: "10m 00s",
        score: 68,
        topics: ["Volume", "Clarity"]
    }
];

export default function ProfilePage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const handleSignOut = async () => {
        try {
            await logout();
            router.push("/");
        } catch (error) {
            console.error("Failed to sign out", error);
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                        <p className="text-muted-foreground">Manage your account and track your progress.</p>
                    </div>
                    <Button variant="outline" onClick={() => router.push("/dashboard")}>
                        Back to Dashboard
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Left Column: User Info & Settings */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Account Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-col items-center space-y-4">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                                        <AvatarFallback className="text-4xl">
                                            {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-center">
                                        <h3 className="font-semibold text-xl">{user.displayName || "VoxLab User"}</h3>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            <span>Joined</span>
                                        </div>
                                        <span>{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="w-4 h-4" />
                                            <span>Email Status</span>
                                        </div>
                                        <Badge variant={user.emailVerified ? "default" : "secondary"}>
                                            {user.emailVerified ? "Verified" : "Unverified"}
                                        </Badge>
                                    </div>
                                </div>

                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Stats & Activity */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {MOCK_STATS.map((stat, index) => (
                                <Card key={index}>
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${stat.bg}`}>
                                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                            <h4 className="text-2xl font-bold">{stat.value}</h4>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Recent Activity */}
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Recent Activity
                                </CardTitle>
                                <CardDescription>Your latest practice sessions and performance scores.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {MOCK_HISTORY.map((session) => (
                                        <div key={session.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-foreground">Practice Session</span>
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {session.duration}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {session.date}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                                                <div className="flex gap-2">
                                                    {session.topics.map((topic) => (
                                                        <Badge key={topic} variant="secondary" className="text-xs">
                                                            {topic}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border-2 ${session.score >= 80 ? "border-green-500 text-green-500 bg-green-500/10" :
                                                        session.score >= 60 ? "border-amber-500 text-amber-500 bg-amber-500/10" :
                                                            "border-red-500 text-red-500 bg-red-500/10"
                                                    }`}>
                                                    {session.score}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <Button variant="ghost" className="w-full text-muted-foreground hover:text-primary">
                                        View All Activity
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

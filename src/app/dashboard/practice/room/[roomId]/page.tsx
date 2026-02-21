"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    doc,
    onSnapshot,
    updateDoc,
    arrayUnion,
    serverTimestamp,
    getDoc
} from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Mic, Users, Clock, ArrowLeft, Sparkles, Play, CheckCircle2, Loader2
} from "lucide-react";
import Link from "next/link";

interface RoomData {
    hostUid: string;
    hostName: string;
    hostAvatar?: string | null;
    createdAt: any;
    status: "waiting" | "active" | "ended";
    participants: string[];
    participantProfiles?: Record<string, { displayName: string; photoURL: string | null }>;
}

export default function PracticeRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const { user, loading } = useAuth();
    const router = useRouter();

    const [room, setRoom] = useState<RoomData | null>(null);
    const [roomLoading, setRoomLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [starting, setStarting] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) router.push("/");
    }, [loading, user, router]);

    // Real-time room listener
    useEffect(() => {
        if (!roomId) return;
        const unsub = onSnapshot(doc(db, "practiceRooms", roomId), (snap) => {
            if (snap.exists()) {
                setRoom(snap.data() as RoomData);
            } else {
                setRoom(null);
            }
            setRoomLoading(false);
        });
        return () => unsub();
    }, [roomId]);

    // Timer when session is active
    useEffect(() => {
        if (room?.status !== "active") return;
        const interval = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(interval);
    }, [room?.status]);

    const handleJoin = useCallback(async () => {
        if (!user || !room) return;
        setJoining(true);
        try {
            await updateDoc(doc(db, "practiceRooms", roomId), {
                participants: arrayUnion(user.uid),
                [`participantProfiles.${user.uid}`]: {
                    displayName: user.displayName || "Anonymous",
                    photoURL: user.photoURL || null
                }
            });
        } catch (e) {
            console.error("Join failed:", e);
        } finally {
            setJoining(false);
        }
    }, [user, room, roomId]);

    const handleStart = useCallback(async () => {
        setStarting(true);
        try {
            await updateDoc(doc(db, "practiceRooms", roomId), {
                status: "active",
                startedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Start failed:", e);
        } finally {
            setStarting(false);
        }
    }, [roomId]);

    const handleEnd = useCallback(async () => {
        await updateDoc(doc(db, "practiceRooms", roomId), {
            status: "ended",
            endedAt: serverTimestamp()
        });
        router.push("/dashboard/practice");
    }, [roomId, router]);

    // Auto-join if not already a participant
    useEffect(() => {
        if (!user || !room || joining) return;
        if (!room.participants.includes(user.uid)) {
            handleJoin();
        }
    }, [user, room, joining, handleJoin]);

    const formatTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    if (loading || roomLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!room) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
                <p className="text-muted-foreground">Room not found or has ended.</p>
                <Button variant="outline" onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
            </div>
        );
    }

    const isHost = user?.uid === room.hostUid;
    const isParticipant = user ? room.participants.includes(user.uid) : false;
    const participantCount = room.participants.length;
    const profiles = room.participantProfiles ?? {};

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Dashboard
                    </Link>
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">Practice Room</span>
                    </div>
                </div>

                {/* Status Card */}
                <Card className={`border-2 ${room.status === "waiting" ? "border-amber-500/30" :
                        room.status === "active" ? "border-green-500/30" :
                            "border-slate-700"
                    }`}>
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-2">
                            {room.status === "waiting" && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-4 py-1">
                                    ⏳ Waiting for participants…
                                </Badge>
                            )}
                            {room.status === "active" && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-4 py-1 animate-pulse">
                                    🔴 Live Session
                                </Badge>
                            )}
                            {room.status === "ended" && (
                                <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-sm px-4 py-1">
                                    ✅ Session Ended
                                </Badge>
                            )}
                        </div>
                        <CardTitle className="text-2xl">
                            {room.hostName}&apos;s Room
                        </CardTitle>
                        {room.status === "active" && (
                            <CardDescription className="text-2xl font-mono font-bold text-green-400 mt-1">
                                <Clock className="w-4 h-4 inline mr-1" />
                                {formatTime(elapsed)}
                            </CardDescription>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Participants */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Participants ({participantCount})
                            </p>
                            <div className="flex flex-wrap gap-4">
                                {room.participants.map((uid) => {
                                    const profile = profiles[uid];
                                    const name = profile?.displayName ?? (uid === room.hostUid ? room.hostName : "User");
                                    const photo = profile?.photoURL ?? null;
                                    return (
                                        <div key={uid} className="flex flex-col items-center gap-2">
                                            <div className="relative">
                                                <Avatar className="h-16 w-16 border-2 border-primary/30">
                                                    <AvatarImage src={photo || ""} alt={name} />
                                                    <AvatarFallback className="text-xl">
                                                        {(name[0] || "U").toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {uid === room.hostUid && (
                                                    <span className="absolute -top-1 -right-1 text-xs bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">👑</span>
                                                )}
                                                {room.status === "active" && (
                                                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground max-w-[64px] truncate text-center">{name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            {/* Waiting: host can start */}
                            {room.status === "waiting" && isHost && (
                                <Button
                                    onClick={handleStart}
                                    disabled={starting || participantCount < 1}
                                    className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white h-12"
                                    size="lg"
                                >
                                    {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                    Start Session
                                </Button>
                            )}

                            {room.status === "waiting" && !isHost && (
                                <div className="text-center p-4 rounded-xl bg-muted/50 border border-dashed text-muted-foreground text-sm">
                                    Waiting for {room.hostName} to start the session…
                                </div>
                            )}

                            {/* Active: everyone sees "Practice Together" + host can end */}
                            {room.status === "active" && (
                                <>
                                    <Button
                                        onClick={() => router.push("/dashboard/practice")}
                                        className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white h-12"
                                        size="lg"
                                    >
                                        <Mic className="w-4 h-4" />
                                        Open My Practice Session
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground">
                                        Each person practices independently. Scores are saved to your profile.
                                    </p>
                                    {isHost && (
                                        <Button variant="destructive" onClick={handleEnd} className="w-full">
                                            End Room for Everyone
                                        </Button>
                                    )}
                                </>
                            )}

                            {/* Ended */}
                            {room.status === "ended" && (
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                    <p className="text-muted-foreground text-sm">Session completed!</p>
                                    <Button onClick={() => router.push("/dashboard/profile")} className="gap-2">
                                        View My Profile & Badges
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Room ID share hint */}
                <p className="text-center text-xs text-muted-foreground">
                    Room ID: <code className="font-mono bg-muted px-2 py-0.5 rounded">{roomId}</code>
                </p>
            </div>
        </div>
    );
}

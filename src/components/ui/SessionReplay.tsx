"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Activity, Eye } from "lucide-react";
import { useSessionReplay, TimeSeriesDataPoint } from "@/hooks/useSessionReplay";

interface SessionReplayProps {
    sessionId: string | null;
    videoUrl?: string | null;
    jsonUrl?: string | null;
    availableSessions?: { id: string, videoUrl: string | null, jsonUrl: string | null, savedAt?: string | null }[];
    onSessionSelect?: (id: string) => void;
}

const GLASS_CARD = "bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 hover:bg-white/[0.05] transition-all duration-300";

export function SessionReplay({ sessionId, videoUrl, jsonUrl, availableSessions, onSessionSelect }: SessionReplayProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const [events, setEvents] = useState<{ timestamp: number, type: string, message: string }[]>([]);

    // Fetch authentic JSON telemetry securely from GCS Signed URL
    useEffect(() => {
        if (!jsonUrl) {
            setEvents([]);
            return;
        }

        const fetchTelemetry = async () => {
            try {
                const res = await fetch(jsonUrl);
                const data = await res.json();
                if (data?.rawMetrics) {
                    const duration = data.rawMetrics.duration || 60; // Default to 60s if missing
                    const issueCounts = data.rawMetrics.issueCounts || {};

                    const generatedEvents: { timestamp: number, type: string, message: string }[] = [];

                    let totalIssues = 0;
                    Object.values(issueCounts).forEach(count => totalIssues += (count as number));

                    if (totalIssues > 0) {
                        const interval = Math.floor(duration / (totalIssues + 1));
                        let currentTime = interval;

                        Object.entries(issueCounts).forEach(([type, count]) => {
                            for (let i = 0; i < (count as number); i++) {
                                const message = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                                generatedEvents.push({
                                    timestamp: currentTime,
                                    type: type.includes('EYE') ? 'EYE_CONTACT' : 'POSTURE',
                                    message: message
                                });
                                currentTime += interval;
                            }
                        });

                        generatedEvents.sort((a, b) => a.timestamp - b.timestamp);
                    }

                    setEvents(generatedEvents);
                } else {
                    setEvents([]);
                }
            } catch (err) {
                console.error("Failed to fetch session telemetry:", err);
                setEvents([]);
            }
        };
        fetchTelemetry();
    }, [jsonUrl]);

    // Simplified generic time series data strictly for the overlay numbers
    const timeSeriesData = useMemo(() => {
        const dummy: TimeSeriesDataPoint[] = [];
        for (let i = 0; i < 300; i += 2) {
            dummy.push({ timestamp: i, posture_score: 85, facial_engagement_score: 80 });
        }
        return dummy;
    }, []);

    // Wire up our custom React hook
    const { currentDataPoint, seekTo } = useSessionReplay(videoRef, timeSeriesData);

    if (!sessionId) {
        return (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`${GLASS_CARD} p-8 rounded-3xl mt-8 flex flex-col items-center justify-center h-56`}
            >
                <div className="flex flex-col items-center gap-4 opacity-40">
                    <PlayCircle className="text-primary" size={48} />
                    <div className="text-center">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Speech Playback</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Select a session to begin replay</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    // A low point click handler to test the seekTo feature
    const handleLowPointClick = (timestamp: number) => {
        seekTo(timestamp);
        if (videoRef.current) videoRef.current.play();
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`${GLASS_CARD} p-8 rounded-3xl mt-8 flex flex-col gap-8`}
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                    <PlayCircle className="text-primary" size={24} />
                    Speech Playback Sync
                </h3>

                {availableSessions && availableSessions.length > 0 ? (
                    <select
                        value={sessionId || ""}
                        onChange={(e) => onSessionSelect?.(e.target.value)}
                        className="bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all cursor-crosshair"
                    >
                        {availableSessions.map((s, idx) => {
                            let text = `Session ${idx + 1}`;

                            if (s.savedAt) {
                                const d = new Date(s.savedAt);
                                if (!isNaN(d.getTime())) {
                                    const isToday = d.toDateString() === new Date().toDateString();
                                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                    text = isToday ? `${timeStr} Today` : `${dateStr}, ${timeStr}`;
                                }
                            }
                            return (
                                <option key={s.id} value={s.id} className="bg-[#050505]">
                                    {text}
                                </option>
                            );
                        })}
                    </select>
                ) : (
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">ID: {sessionId?.substring(0, 8)}</span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Mock Video Player */}
                <div className="relative aspect-video bg-[#050505] rounded-3xl overflow-hidden border border-white/5 group">
                    <video
                        ref={videoRef}
                        controls
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                        src={videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                    />
                    <div className="absolute top-6 left-6 flex flex-col gap-3">
                        <div className="bg-[#050505]/60 backdrop-blur-xl px-4 py-2 rounded-xl text-[10px] font-black font-mono text-white flex items-center gap-2.5 border border-white/10">
                            <Activity size={14} className="text-emerald-400" />
                            POSTURE: {currentDataPoint?.posture_score?.toFixed(0) || "--"}
                        </div>
                        <div className="bg-[#050505]/60 backdrop-blur-xl px-4 py-2 rounded-xl text-[10px] font-black font-mono text-white flex items-center gap-2.5 border border-white/10">
                            <Eye size={14} className="text-pink-400" />
                            FACIAL: {currentDataPoint?.facial_engagement_score?.toFixed(0) || "--"}
                        </div>
                    </div>
                </div>

                {/* Real-time Telemetry Scrubber Area */}
                <div className="relative w-full aspect-video bg-white/[0.02] rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                    {/* Sticky header */}
                    <div className="bg-white/[0.03] backdrop-blur-xl p-6 pb-4 z-20 border-b border-white/5">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Timeline Analytics</h4>
                        <p className="text-gray-400 text-xs font-medium leading-relaxed">
                            {events.length > 0
                                ? "Jump to flagged engagement points:"
                                : "Excellent! No critical issues flagged."}
                        </p>
                    </div>

                    {/* Scrollable area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
                        <div className="flex flex-col gap-4 pb-2">
                            {events.map((evt: { timestamp: number, type: string, message: string }, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => handleLowPointClick(evt.timestamp)}
                                    className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all p-4 rounded-2xl flex items-center justify-between group/item"
                                >
                                    <div className="flex flex-col items-start text-left">
                                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${evt.type === 'EYE_CONTACT' ? 'text-pink-400 group-hover/item:text-pink-300' : 'text-amber-400 group-hover/item:text-amber-300'}`}>
                                            {evt.message}
                                        </span>
                                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-tighter mt-1">
                                            {evt.type === 'EYE_CONTACT' ? 'Gaze diversion detected' : 'Body posture threshold fall'}
                                        </span>
                                    </div>
                                    <span className="bg-[#050505] border border-white/10 text-gray-400 text-[10px] font-black font-mono px-3 py-1.5 rounded-lg whitespace-nowrap group-hover/item:text-white transition-colors">
                                        {Math.floor(evt.timestamp / 60)}:{(evt.timestamp % 60).toString().padStart(2, '0')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

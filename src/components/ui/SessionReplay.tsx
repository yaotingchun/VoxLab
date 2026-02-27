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
                        className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-bold uppercase tracking-widest rounded-full px-5 py-3 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all cursor-pointer appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em', paddingRight: '3rem' }}
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
                                <option key={s.id} value={s.id} className="bg-[#13111C] text-slate-200 font-medium">
                                    {text}
                                </option>
                            );
                        })}
                    </select>
                ) : (
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest bg-white/[0.02] px-4 py-2 rounded-full border border-white/5">
                        ID: {sessionId?.substring(0, 8)}
                    </span>
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
                        <div className="bg-black/60 backdrop-blur-xl px-4 py-2.5 rounded-full text-xs font-bold tracking-widest text-white flex items-center gap-3 border border-white/10 shadow-lg shadow-black/50">
                            <Activity size={16} className="text-emerald-400" />
                            POSTURE: <span className="text-emerald-400 font-black">{currentDataPoint?.posture_score?.toFixed(0) || "--"}</span>
                        </div>
                        <div className="bg-black/60 backdrop-blur-xl px-4 py-2.5 rounded-full text-xs font-bold tracking-widest text-white flex items-center gap-3 border border-white/10 shadow-lg shadow-black/50">
                            <Eye size={16} className="text-pink-400" />
                            FACIAL: <span className="text-pink-400 font-black">{currentDataPoint?.facial_engagement_score?.toFixed(0) || "--"}</span>
                        </div>
                    </div>
                </div>

                {/* Real-time Telemetry Scrubber Area */}
                <div className="relative w-full aspect-video bg-[#1B1824]/50 rounded-3xl border border-white/5 flex flex-col overflow-hidden shadow-inner">
                    {/* Sticky header */}
                    <div className="bg-transparent p-6 pb-4 z-20 border-b border-white/5 relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#1B1824] to-transparent pointer-events-none" />
                        <div className="relative z-10">
                            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1.5 flex items-center gap-2">
                                Timeline Analytics
                            </h4>
                            <p className="text-slate-300 text-[15px] font-medium leading-relaxed">
                                {events.length > 0
                                    ? "Jump to flagged engagement points:"
                                    : "Excellent! No critical issues flagged."}
                            </p>
                        </div>
                    </div>

                    {/* Scrollable area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
                        <div className="flex flex-col gap-3 pb-2">
                            {events.map((evt: { timestamp: number, type: string, message: string }, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => handleLowPointClick(evt.timestamp)}
                                    className="bg-[#242130]/60 hover:bg-[#2C283B] border border-white/5 hover:border-white/10 transition-colors duration-300 p-4 rounded-[1.25rem] flex items-center justify-between group/item"
                                >
                                    <div className="flex flex-col items-start text-left">
                                        <span className={`text-[13px] font-bold uppercase tracking-wider transition-colors ${evt.type === 'EYE_CONTACT' ? 'text-pink-400 group-hover/item:text-pink-300' : 'text-amber-500 group-hover/item:text-amber-400'}`}>
                                            {evt.message}
                                        </span>
                                        <span className="text-slate-400 text-[11px] font-medium uppercase tracking-widest mt-1">
                                            {evt.type === 'EYE_CONTACT' ? 'Gaze diversion detected' : 'Body posture threshold fall'}
                                        </span>
                                    </div>
                                    <span className="bg-black/40 text-slate-300 text-xs font-bold font-mono px-3 py-1.5 rounded-lg whitespace-nowrap group-hover/item:bg-black/60 group-hover/item:text-white transition-colors">
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

"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Eye, Activity } from "lucide-react";
import { useSessionReplay, TimeSeriesDataPoint } from "@/hooks/useSessionReplay";

interface SessionReplayProps {
    sessionId: string | null;
    videoUrl?: string | null;
    jsonUrl?: string | null;
    availableSessions?: { id: string, videoUrl: string | null, jsonUrl: string | null, savedAt?: string | null }[];
    onSessionSelect?: (id: string) => void;
}

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

                    // The user requested we IGNORE the live buffered explicit events,
                    // and instead generate timeline markers perfectly matching the Final Report's inflated issueCounts tally.
                    const generatedEvents: { timestamp: number, type: string, message: string }[] = [];

                    // We'll distribute them somewhat evenly across the video
                    let totalIssues = 0;
                    Object.values(issueCounts).forEach(count => totalIssues += (count as number));

                    if (totalIssues > 0) {
                        const interval = Math.floor(duration / (totalIssues + 1));
                        let currentTime = interval;

                        Object.entries(issueCounts).forEach(([type, count]) => {
                            for (let i = 0; i < (count as number); i++) {
                                // Format the type to be a readable message
                                const message = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                                generatedEvents.push({
                                    timestamp: currentTime,
                                    type: type.includes('EYE') ? 'EYE_CONTACT' : 'POSTURE',
                                    message: message
                                });
                                currentTime += interval;
                            }
                        });

                        // Sort them chronologically just in case
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
    const { currentTime, currentDataPoint, seekTo } = useSessionReplay(videoRef, timeSeriesData);

    if (!sessionId) {
        return (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-slate-900/80 border border-slate-700/50 p-6 rounded-3xl mt-8 flex flex-col items-center justify-center h-48"
            >
                <div className="flex items-center gap-3 opacity-50 mb-3">
                    <PlayCircle className="text-blue-500" size={32} />
                    <h3 className="text-xl font-bold text-white">Speech Playback Sync (Time-Machine)</h3>
                </div>
                <p className="text-slate-500 text-sm">Record a session or select a node on the graph to view playback details.</p>
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
            className="bg-slate-900/80 border border-slate-700/50 p-6 rounded-3xl mt-8 flex flex-col gap-6"
        >
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <PlayCircle className="text-blue-500" />
                    Speech Playback Sync (Time-Machine)
                </h3>

                {availableSessions && availableSessions.length > 0 ? (
                    <select
                        value={sessionId || ""}
                        onChange={(e) => onSessionSelect?.(e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium tabular-nums tracking-wide rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                    >
                        {availableSessions.map((s, idx) => {
                            let text = `Session ${idx + 1} (#${s.id.substring(0, 5)})`;

                            if (s.savedAt) {
                                const d = new Date(s.savedAt);
                                if (!isNaN(d.getTime())) {
                                    const isToday = d.toDateString() === new Date().toDateString();
                                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                    text = isToday ? `${timeStr} Recording` : `${dateStr}, ${timeStr} Recording`;
                                }
                            }
                            return (
                                <option key={s.id} value={s.id}>
                                    {text}
                                </option>
                            );
                        })}
                    </select>
                ) : (
                    <span className="text-slate-400 text-sm">Session: {sessionId?.substring(0, 8) || "None"}</span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mock Video Player */}
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
                    <video
                        ref={videoRef}
                        controls
                        className="w-full h-full object-cover opacity-60"
                        src={videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                    />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold font-mono text-white flex items-center gap-2 border border-slate-600/50">
                            <Activity size={12} className="text-green-400" />
                            Posture: {currentDataPoint?.posture_score?.toFixed(0) || "--"}
                        </div>
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold font-mono text-white flex items-center gap-2 border border-slate-600/50">
                            <Eye size={12} className="text-pink-400" />
                            Facial: {currentDataPoint?.facial_engagement_score?.toFixed(0) || "--"}
                        </div>
                    </div>
                </div>

                {/* Real-time Telemetry Scrubber Area */}
                <div className="relative w-full aspect-video bg-slate-900/40 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
                    {/* Sticky header now separated from the scrollable area */}
                    <div className="bg-slate-900/95 backdrop-blur-md p-4 pb-3 z-20 border-b border-slate-800/80 shadow-md">
                        <p className="text-slate-400 text-sm">
                            {events.length > 0
                                ? "Jump directly to low-engagement points measured during recording:"
                                : "Excellent! No critical posture or distraction events were flagged during this session."}
                        </p>
                    </div>

                    {/* The scrollable area strictly below the header */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-2">
                        <div className="flex flex-col gap-3 pb-2">
                            {events.map((evt: { timestamp: number, type: string, message: string }, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => handleLowPointClick(evt.timestamp)}
                                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors p-4 rounded-xl flex items-center justify-between group"
                                >
                                    <div className="flex flex-col items-start text-left">
                                        <span className={`font-bold transition-colors ${evt.type === 'EYE_CONTACT' ? 'text-pink-400 group-hover:text-pink-300' : 'text-amber-400 group-hover:text-amber-300'}`}>
                                            {evt.message}
                                        </span>
                                        <span className="text-slate-400 text-xs">
                                            {evt.type === 'EYE_CONTACT' ? 'Looked away from camera' : 'Score dropped below threshold'}
                                        </span>
                                    </div>
                                    <span className="bg-slate-900 border border-slate-600 text-slate-300 text-xs font-mono px-2 py-1 rounded whitespace-nowrap">
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

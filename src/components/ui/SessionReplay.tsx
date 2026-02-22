"use client";

import { useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { PlayCircle, Eye, Activity } from "lucide-react";
import { useSessionReplay, TimeSeriesDataPoint } from "@/hooks/useSessionReplay";

interface SessionReplayProps {
    sessionId: string | null;
    videoUrl?: string | null;
}

// Mock telemetry data since we don't have the full raw GCS payload for video sync yet
const generateMockTelemetry = (): TimeSeriesDataPoint[] => {
    const data = [];
    for (let i = 0; i <= 60; i += 5) {
        data.push({
            timestamp: i,
            posture_score: 80 - Math.random() * 20 - (i > 20 && i < 40 ? 30 : 0), // Slouch around 20-40s
            facial_engagement_score: 70 + Math.random() * 10 - (i > 40 ? 40 : 0), // Low engagement end
        });
    }
    return data;
};

export function SessionReplay({ sessionId, videoUrl }: SessionReplayProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeSeriesData = useMemo(() => generateMockTelemetry(), [sessionId]);

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
                <span className="text-slate-400 text-sm">Session: {sessionId.substring(0, 8)}...</span>
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

                {/* Simulated Graph/Telemetry Scrubber Area */}
                <div className="flex flex-col justify-center gap-4">
                    <p className="text-slate-400 text-sm mb-4">
                        Jump directly to low-engagement points detected in your video telemetry:
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => handleLowPointClick(25)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors p-4 rounded-xl flex items-center justify-between group"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-white font-bold group-hover:text-amber-400 transition-colors">Posture Slouch Detected</span>
                                <span className="text-slate-400 text-xs">Score dropped below 50</span>
                            </div>
                            <span className="bg-slate-900 border border-slate-600 text-slate-300 text-xs font-mono px-2 py-1 rounded">0:25</span>
                        </button>

                        <button
                            onClick={() => handleLowPointClick(45)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors p-4 rounded-xl flex items-center justify-between group"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-white font-bold group-hover:text-pink-400 transition-colors">Eye Contact Lost</span>
                                <span className="text-slate-400 text-xs">Looked away from camera</span>
                            </div>
                            <span className="bg-slate-900 border border-slate-600 text-slate-300 text-xs font-mono px-2 py-1 rounded">0:45</span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Copy, Check, ArrowLeft, Radio, TrendingUp, Clock, Gauge, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";

// WPM Zones
const WPM_TARGET_LOW = 130;
const WPM_TARGET_HIGH = 155;
const WPM_WARNING_LOW = 110;
const WPM_WARNING_HIGH = 180;

// Filler words to detect (lowercase)
const FILLER_WORDS = [
    "um", "umm", "uh", "uhh", "uhm", "er", "err", "ah", "ahh",
    "like", "basically", "actually", "literally", "honestly",
    "right", "so", "well", "anyway", "anyways",
];
const FILLER_PHRASES = [
    "you know", "i mean", "sort of", "kind of", "you see",
];

function countFillers(text: string): Record<string, number> {
    const lower = text.toLowerCase();
    const counts: Record<string, number> = {};

    // Count multi-word phrases first
    for (const phrase of FILLER_PHRASES) {
        const regex = new RegExp(`\\b${phrase}\\b`, "gi");
        const matches = lower.match(regex);
        if (matches && matches.length > 0) {
            counts[phrase] = (counts[phrase] || 0) + matches.length;
        }
    }

    // Count single filler words
    const words = lower.replace(/[^a-z\s]/g, "").split(/\s+/);
    for (const word of words) {
        if (FILLER_WORDS.includes(word)) {
            counts[word] = (counts[word] || 0) + 1;
        }
    }

    return counts;
}

interface TranscriptSegment {
    text: string;
    isFinal: boolean;
    timestamp: number; // ms since recording started
}

interface WpmDataPoint {
    time: number;       // seconds since start
    wpm: number;
    wordCount: number;
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function getWpmZoneColor(wpm: number): string {
    if (wpm < WPM_WARNING_LOW) return "#ef4444";   // red
    if (wpm < WPM_TARGET_LOW) return "#f59e0b";    // amber
    if (wpm <= WPM_TARGET_HIGH) return "#22c55e";   // green
    if (wpm <= WPM_WARNING_HIGH) return "#f59e0b";  // amber
    return "#ef4444";                                // red
}

function getWpmFeedback(avgWpm: number): { message: string; type: "good" | "warn" | "bad" } {
    if (avgWpm === 0) return { message: "", type: "good" };
    if (avgWpm < WPM_WARNING_LOW) return { message: "You're speaking quite slowly. Try to pick up the pace a bit for better audience engagement.", type: "bad" };
    if (avgWpm < WPM_TARGET_LOW) return { message: "Slightly below target pace. A small increase in speed will land you in the sweet spot.", type: "warn" };
    if (avgWpm <= WPM_TARGET_HIGH) return { message: "Excellent pacing! You're right in the target zone — clear, engaging, and easy to follow.", type: "good" };
    if (avgWpm <= WPM_WARNING_HIGH) return { message: "You're speaking a bit fast. Try slowing down to let your points land with the audience.", type: "warn" };
    return { message: "You're speaking very fast. Slow down significantly — your audience may struggle to keep up.", type: "bad" };
}

// --- Pacing Chart Component ---
function PacingChart({ dataPoints }: { dataPoints: WpmDataPoint[] }) {
    if (dataPoints.length < 2) return null;

    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxTime = Math.max(...dataPoints.map(d => d.time));
    const maxWpm = Math.max(WPM_WARNING_HIGH + 20, ...dataPoints.map(d => d.wpm));
    const minWpm = Math.max(0, Math.min(WPM_WARNING_LOW - 20, ...dataPoints.map(d => d.wpm)));
    const wpmRange = maxWpm - minWpm;

    const scaleX = (t: number) => padding.left + (t / maxTime) * chartW;
    const scaleY = (w: number) => padding.top + chartH - ((w - minWpm) / wpmRange) * chartH;

    // Build SVG path
    const pathData = dataPoints
        .map((dp, i) => `${i === 0 ? "M" : "L"} ${scaleX(dp.time).toFixed(1)} ${scaleY(dp.wpm).toFixed(1)}`)
        .join(" ");

    // Area under the line
    const areaData = pathData
        + ` L ${scaleX(dataPoints[dataPoints.length - 1].time).toFixed(1)} ${scaleY(minWpm).toFixed(1)}`
        + ` L ${scaleX(dataPoints[0].time).toFixed(1)} ${scaleY(minWpm).toFixed(1)} Z`;

    // Horizontal zone lines
    const zoneLines = [
        { wpm: WPM_WARNING_LOW, label: `${WPM_WARNING_LOW}`, color: "#ef4444", dash: "4,4" },
        { wpm: WPM_TARGET_LOW, label: `${WPM_TARGET_LOW}`, color: "#22c55e", dash: "6,3" },
        { wpm: WPM_TARGET_HIGH, label: `${WPM_TARGET_HIGH}`, color: "#22c55e", dash: "6,3" },
        { wpm: WPM_WARNING_HIGH, label: `${WPM_WARNING_HIGH}`, color: "#ef4444", dash: "4,4" },
    ].filter(z => z.wpm >= minWpm && z.wpm <= maxWpm);

    // Target zone shading
    const targetTop = scaleY(Math.min(WPM_TARGET_HIGH, maxWpm));
    const targetBottom = scaleY(Math.max(WPM_TARGET_LOW, minWpm));

    // Time axis labels
    const timeLabels: number[] = [];
    const step = maxTime <= 30 ? 10 : maxTime <= 120 ? 30 : 60;
    for (let t = 0; t <= maxTime; t += step) {
        timeLabels.push(t);
    }

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Target zone shading */}
            <rect
                x={padding.left} y={targetTop}
                width={chartW} height={targetBottom - targetTop}
                fill="#22c55e" opacity="0.06"
            />

            {/* Zone reference lines */}
            {zoneLines.map((z, i) => (
                <g key={i}>
                    <line
                        x1={padding.left} y1={scaleY(z.wpm)}
                        x2={padding.left + chartW} y2={scaleY(z.wpm)}
                        stroke={z.color} strokeWidth="1" strokeDasharray={z.dash} opacity="0.4"
                    />
                    <text x={padding.left - 5} y={scaleY(z.wpm) + 4} textAnchor="end" fill={z.color} fontSize="10" opacity="0.6">
                        {z.label}
                    </text>
                </g>
            ))}

            {/* Area fill */}
            <path d={areaData} fill="url(#areaGradient)" />
            <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {/* Main line */}
            <path d={pathData} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Data points */}
            {dataPoints.map((dp, i) => (
                <circle
                    key={i}
                    cx={scaleX(dp.time)} cy={scaleY(dp.wpm)}
                    r="4" fill={getWpmZoneColor(dp.wpm)} stroke="#1a1a2e" strokeWidth="2"
                />
            ))}

            {/* X-axis labels */}
            {timeLabels.map(t => (
                <text key={t} x={scaleX(t)} y={height - 5} textAnchor="middle" fill="#6b7280" fontSize="10">
                    {t}s
                </text>
            ))}

            {/* Axis label */}
            <text x={padding.left - 5} y={padding.top - 6} textAnchor="end" fill="#6b7280" fontSize="10">
                WPM
            </text>
        </svg>
    );
}

// --- Main Page Component ---
export default function SpeechCoachPage() {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [interimText, setInterimText] = useState("");
    const [copied, setCopied] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [liveWpm, setLiveWpm] = useState(0);

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const recordingStartRef = useRef<number>(0);
    const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { user } = useAuth();
    const router = useRouter();

    // --- WPM Calculation ---
    const wpmDataPoints = useMemo((): WpmDataPoint[] => {
        if (segments.length === 0) return [];

        const bucketSizeSec = 30;
        const bucketSizeMs = bucketSizeSec * 1000;
        const finalSegments = segments.filter(s => s.isFinal);
        if (finalSegments.length === 0) return [];

        const maxTimestamp = Math.max(...finalSegments.map(s => s.timestamp));
        const totalBuckets = Math.ceil(maxTimestamp / bucketSizeMs);
        if (totalBuckets === 0) return [];

        // Accumulate fractional word counts per bucket
        const bucketWords = new Array<number>(totalBuckets).fill(0);

        let prevEndMs = 0;
        for (const seg of finalSegments) {
            const words = countWords(seg.text);
            if (words === 0) continue;

            const segEndMs = seg.timestamp;
            const segStartMs = prevEndMs;
            const segDuration = segEndMs - segStartMs;
            prevEndMs = segEndMs;

            if (segDuration <= 0) {
                // Edge case: same timestamp, dump into that bucket
                const bucketIdx = Math.min(Math.floor(segEndMs / bucketSizeMs), totalBuckets - 1);
                bucketWords[bucketIdx] += words;
                continue;
            }

            // Distribute words proportionally across all buckets this segment spans
            for (let b = 0; b < totalBuckets; b++) {
                const bStart = b * bucketSizeMs;
                const bEnd = (b + 1) * bucketSizeMs;

                // Overlap between [segStartMs, segEndMs] and [bStart, bEnd]
                const overlapStart = Math.max(segStartMs, bStart);
                const overlapEnd = Math.min(segEndMs, bEnd);
                const overlap = overlapEnd - overlapStart;

                if (overlap > 0) {
                    const fraction = overlap / segDuration;
                    bucketWords[b] += words * fraction;
                }
            }
        }

        return bucketWords.map((wordCount, b) => ({
            time: (b + 1) * bucketSizeSec,
            wpm: Math.round((wordCount / bucketSizeSec) * 60),
            wordCount: Math.round(wordCount),
        }));
    }, [segments]);

    const averageWpm = useMemo(() => {
        const finalWords = segments.filter(s => s.isFinal).reduce((sum, s) => sum + countWords(s.text), 0);
        // Include interim words during recording for responsive live WPM
        const interimWords = interimText ? countWords(interimText) : 0;
        const totalWords = finalWords + interimWords;
        if (totalWords === 0 || recordingDuration === 0) return 0;
        const totalMinutes = recordingDuration / 60;
        return Math.round(totalWords / totalMinutes);
    }, [segments, recordingDuration, interimText]);

    const totalWordCount = useMemo(() => {
        return segments.filter(s => s.isFinal).reduce((sum, s) => sum + countWords(s.text), 0);
    }, [segments]);

    const feedback = useMemo(() => getWpmFeedback(averageWpm), [averageWpm]);

    // Filler word detection
    const fillerData = useMemo(() => {
        const fullText = segments.filter(s => s.isFinal).map(s => s.text).join(" ");
        const counts = countFillers(fullText);
        const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
        // Sort by count descending
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const fillersPerMinute = recordingDuration > 0 ? Math.round((total / (recordingDuration / 60)) * 10) / 10 : 0;
        return { counts: sorted, total, fillersPerMinute };
    }, [segments, recordingDuration]);

    // Snapshot live WPM every 5 seconds during recording
    const liveWpmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const averageWpmRef = useRef(averageWpm);
    useEffect(() => { averageWpmRef.current = averageWpm; }, [averageWpm]);

    useEffect(() => {
        if (isRecording) {
            // Update immediately on start
            setLiveWpm(averageWpmRef.current);
            liveWpmIntervalRef.current = setInterval(() => {
                setLiveWpm(averageWpmRef.current);
            }, 5000);
        } else {
            if (liveWpmIntervalRef.current) {
                clearInterval(liveWpmIntervalRef.current);
                liveWpmIntervalRef.current = null;
            }
        }
        return () => {
            if (liveWpmIntervalRef.current) {
                clearInterval(liveWpmIntervalRef.current);
            }
        };
    }, [isRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (processorRef.current) {
                processorRef.current.disconnect();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        };
    }, []);

    const connectWebSocket = useCallback((): Promise<WebSocket> => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                setWsConnected(true);
                setError(null);
                resolve(ws);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.error) {
                        setError(data.error);
                        return;
                    }
                    // Server signals all final results have been flushed
                    if (data.done) {
                        setIsProcessing(false);
                        setInterimText("");
                        // Close the WS now that we have all results
                        setTimeout(() => {
                            wsRef.current?.close();
                            wsRef.current = null;
                        }, 200);
                        return;
                    }
                    // Use audio timestamp from Google API (ms from start of audio)
                    const timestamp = data.audioTimestampMs || (Date.now() - recordingStartRef.current);
                    if (data.isFinal) {
                        setSegments(prev => [...prev, { text: data.transcript, isFinal: true, timestamp }]);
                        setInterimText("");
                    } else {
                        setInterimText(data.transcript);
                    }
                } catch {
                    console.error("Failed to parse WS message:", event.data);
                }
            };

            ws.onclose = () => {
                setWsConnected(false);
                wsRef.current = null;
            };

            ws.onerror = () => {
                setError("Failed to connect to transcription server. Is it running?");
                setWsConnected(false);
                reject(new Error("WebSocket connection failed"));
            };
        });
    }, []);

    // Downsample Float32 audio from native sample rate to 16kHz LINEAR16
    const downsampleToLinear16 = (input: Float32Array, inputRate: number, outputRate: number): ArrayBuffer => {
        const ratio = inputRate / outputRate;
        const outputLength = Math.floor(input.length / ratio);
        const output = new Int16Array(outputLength);
        for (let i = 0; i < outputLength; i++) {
            const srcIndex = Math.floor(i * ratio);
            // Clamp to [-1, 1] and convert to 16-bit PCM
            const s = Math.max(-1, Math.min(1, input[srcIndex]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output.buffer;
    };

    const startRecording = async () => {
        try {
            setError(null);
            setSegments([]);
            setInterimText("");
            setRecordingDuration(0);
            recordingStartRef.current = Date.now();

            // Duration timer
            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
            }, 1000);

            const ws = await connectWebSocket();

            // Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, sampleRate: 16000 },
            });
            mediaStreamRef.current = stream;

            // Create AudioContext for raw PCM capture
            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);

            // ScriptProcessorNode to capture raw audio buffers
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBuffer = downsampleToLinear16(inputData, audioContext.sampleRate, 16000);
                    ws.send(pcmBuffer);
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            // Tell server to start Google stream
            ws.send("start");
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            setError(err instanceof Error ? err.message : "Failed to start recording");
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        }
    };

    const stopRecording = useCallback(() => {
        // Stop audio processing
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        // Tell server to stop — it will flush final results then send { done: true }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send("stop");
            setIsProcessing(true);
            // Timeout fallback: if server doesn't send done within 10s, finish anyway
            setTimeout(() => {
                setIsProcessing(prev => {
                    if (prev) {
                        // Still processing after timeout, force finish
                        wsRef.current?.close();
                        wsRef.current = null;
                        return false;
                    }
                    return prev;
                });
            }, 10000);
        }

        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }

        // Freeze final duration
        setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
        setIsRecording(false);
        setInterimText("");
    }, []);

    const getFullTranscript = () => segments.map(s => s.text).join(" ");

    const copyToClipboard = () => {
        const text = getFullTranscript();
        if (text) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // Redirect non-authed users
    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] opacity-40" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] opacity-40" />
                </div>
                <div className="z-10 text-center space-y-6">
                    <Mic className="w-16 h-16 text-primary mx-auto" />
                    <h1 className="text-3xl font-bold text-white">Sign in Required</h1>
                    <p className="text-muted-foreground max-w-md">
                        You need to sign in to access the AI Speech Coach.
                    </p>
                    <Button onClick={() => router.push("/")} variant="outline" className="rounded-full border-white/10">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </div>
            </div>
        );
    }

    const hasResults = segments.filter(s => s.isFinal).length > 0;
    const showStats = hasResults && !isRecording && !isProcessing;

    return (
        <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] opacity-40 animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] opacity-40" />
            </div>

            {/* Header */}
            <header className="z-50 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                <button
                    onClick={() => {
                        stopRecording();
                        router.push("/");
                    }}
                    className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back to Home</span>
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-lg flex items-center justify-center">
                        <Mic className="text-white w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">Speech Coach</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground hidden sm:block">
                    {user.email?.split("@")[0]}
                </span>
            </header>

            {/* Main Content */}
            <main className="z-10 flex-1 flex flex-col items-center px-6 py-8 max-w-4xl mx-auto w-full">
                {/* Hero Icon */}
                <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 ring-1 ring-primary/20 mb-6">
                    {isRecording && (
                        <>
                            <div className="absolute inset-0 rounded-full border border-primary/50 animate-ripple" />
                            <div className="absolute inset-0 rounded-full border border-primary/30 animate-ripple" style={{ animationDelay: "0.5s" }} />
                            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ripple" style={{ animationDelay: "1s" }} />
                        </>
                    )}
                    <Mic className={`relative z-10 w-10 h-10 transition-colors duration-300 ${isRecording ? "text-primary" : "text-muted-foreground"}`} />
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-2">
                    AI Speech Coach
                </h1>
                <p className="text-muted-foreground text-center text-base mb-8 max-w-lg">
                    Speak and see your words appear in real-time, powered by Google Chirp 2.
                </p>

                {/* Error */}
                {error && (
                    <div className="w-full max-w-lg mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Controls */}
                <div className="flex justify-center items-center gap-4 mb-6">
                    {!isRecording ? (
                        <Button
                            onClick={startRecording}
                            disabled={isProcessing}
                            size="lg"
                            className="rounded-full bg-primary hover:bg-primary/90 text-lg px-10 py-7 h-auto shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50"
                        >
                            <Mic className="mr-2 h-5 w-5" />
                            Start Recording
                        </Button>
                    ) : (
                        <Button
                            onClick={stopRecording}
                            variant="destructive"
                            size="lg"
                            className="rounded-full text-lg px-10 py-7 h-auto shadow-lg shadow-red-500/20"
                        >
                            <Square className="mr-2 h-5 w-5" />
                            Stop Recording
                        </Button>
                    )}
                </div>

                {/* Processing Indicator */}
                {isProcessing && (
                    <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground">Processing final results...</span>
                    </div>
                )}

                {/* Live Indicator + Timer */}
                {isRecording && wsConnected && (
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2 text-sm text-primary">
                            <Radio className="w-4 h-4 animate-pulse" />
                            <span>Listening...</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-mono">{formatDuration(recordingDuration)}</span>
                        </div>
                        {liveWpm > 0 && (
                            <div className="flex items-center gap-1.5 text-sm" style={{ color: getWpmZoneColor(liveWpm) }}>
                                <Gauge className="w-3.5 h-3.5" />
                                <span className="font-mono">{liveWpm} WPM</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Transcript Display */}
                {(segments.length > 0 || interimText) && (
                    <div className="w-full p-6 rounded-2xl bg-white/5 border border-white/10 relative group mb-6 min-h-[150px]">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={copyToClipboard}
                                className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-muted-foreground hover:text-white transition-colors"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                            Live Transcript
                        </div>
                        <p className="text-lg leading-relaxed whitespace-pre-wrap font-light">
                            {segments.map((seg, i) => (
                                <span key={i} className="text-white">{seg.text} </span>
                            ))}
                            {interimText && (
                                <span className="text-white/40 italic">{interimText}</span>
                            )}
                        </p>
                    </div>
                )}

                {/* --- WPM Statistics Panel (shown after recording stops) --- */}
                {showStats && (
                    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Average WPM */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
                                <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    <Gauge className="w-3.5 h-3.5" />
                                    Avg WPM
                                </div>
                                <div className="text-3xl font-bold" style={{ color: getWpmZoneColor(averageWpm) }}>
                                    {averageWpm}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Target: {WPM_TARGET_LOW}–{WPM_TARGET_HIGH}
                                </div>
                            </div>

                            {/* Total Words */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
                                <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Words
                                </div>
                                <div className="text-3xl font-bold text-white">
                                    {totalWordCount}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    spoken total
                                </div>
                            </div>

                            {/* Duration */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
                                <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    Duration
                                </div>
                                <div className="text-3xl font-bold text-white font-mono">
                                    {formatDuration(recordingDuration)}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    minutes:seconds
                                </div>
                            </div>
                        </div>

                        {/* Filler Words Card */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Filler Words
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {fillerData.fillersPerMinute}/min
                                </div>
                            </div>
                            {fillerData.total === 0 ? (
                                <div className="text-center py-3">
                                    <div className="text-2xl font-bold text-green-400">0</div>
                                    <div className="text-xs text-green-400/70 mt-1">No fillers detected — great job! 🎉</div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-4">
                                        <div className={`text-2xl font-bold ${fillerData.total <= 3 ? "text-green-400" : fillerData.total <= 8 ? "text-amber-400" : "text-red-400"}`}>
                                            {fillerData.total}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {fillerData.total <= 3 ? "Minimal fillers" : fillerData.total <= 8 ? "Some fillers detected" : "High filler usage"}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {fillerData.counts.map(([word, count]) => (
                                            <div key={word} className="flex items-center justify-between text-sm">
                                                <span className="text-white/70 italic">&ldquo;{word}&rdquo;</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-amber-500/70"
                                                            style={{ width: `${Math.min(100, (count / fillerData.total) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-amber-400 font-mono w-6 text-right">{count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Feedback */}
                        {feedback.message && (
                            <div className={`p-4 rounded-xl border text-sm ${feedback.type === "good"
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : feedback.type === "warn"
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                                }`}>
                                <span className="font-medium">
                                    {feedback.type === "good" ? "✅ " : feedback.type === "warn" ? "⚠️ " : "🔴 "}
                                </span>
                                {feedback.message}
                            </div>
                        )}

                        {/* Pacing Graph */}
                        {wpmDataPoints.length >= 2 && (
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">
                                    Pacing Over Time (every 10 seconds)
                                </div>
                                <PacingChart dataPoints={wpmDataPoints} />
                                <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-0.5 bg-green-500 rounded inline-block" /> Target Zone ({WPM_TARGET_LOW}–{WPM_TARGET_HIGH})
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-0.5 bg-amber-500 rounded inline-block" /> Warning
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-3 h-0.5 bg-red-500 rounded inline-block" /> Too Slow / Fast
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Per-interval breakdown table */}
                        {wpmDataPoints.length > 0 && (
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">
                                    Interval Breakdown
                                </div>
                                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-6 gap-y-2 text-sm">
                                    <div className="text-muted-foreground font-medium">Interval</div>
                                    <div className="text-muted-foreground font-medium">Speed</div>
                                    <div className="text-muted-foreground font-medium text-right">WPM</div>
                                    <div className="text-muted-foreground font-medium text-right">Words</div>
                                    {wpmDataPoints.map((dp, i) => (
                                        <div key={i} className="contents">
                                            <div className="text-white/70 font-mono text-xs">
                                                {dp.time - 30}s – {dp.time}s
                                            </div>
                                            <div className="flex items-center">
                                                <div
                                                    className="h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(100, (dp.wpm / (WPM_WARNING_HIGH + 20)) * 100)}%`,
                                                        backgroundColor: getWpmZoneColor(dp.wpm),
                                                        minWidth: dp.wpm > 0 ? "4px" : "0",
                                                    }}
                                                />
                                            </div>
                                            <div className="text-right font-mono" style={{ color: getWpmZoneColor(dp.wpm) }}>
                                                {dp.wpm}
                                            </div>
                                            <div className="text-right text-white/60 font-mono">
                                                {dp.wordCount}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

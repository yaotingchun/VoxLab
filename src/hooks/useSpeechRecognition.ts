"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    PauseStats,
    calculatePauseStats,
    getPauseFeedback,
    analyzePauses,
    Word
} from "@/lib/pause-analysis";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";

// Filler words matching legacy coach
const FILLER_WORDS = [
    "um", "umm", "uh", "uhh", "uhm", "er", "err", "ah", "ahh",
    "like", "basically", "actually", "literally", "honestly",
    "right", "so", "well", "anyway", "anyways",
];
const FILLER_PHRASES = [
    "you know", "i mean", "sort of", "kind of", "you see",
];

// Downsample Float32 audio to 16kHz LINEAR16
const downsampleToLinear16 = (input: Float32Array, inputRate: number, outputRate: number): ArrayBuffer => {
    const ratio = inputRate / outputRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Int16Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        const srcIndex = Math.floor(i * ratio);
        const s = Math.max(-1, Math.min(1, input[srcIndex]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
};

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimText, setInterimText] = useState("");
    const [elapsedTime, setElapsedTime] = useState(0);
    const [wpm, setWpm] = useState(0);
    const [fillerCounts, setFillerCounts] = useState<Record<string, number>>({});
    const [pauseCount, setPauseCount] = useState(0);
    const [wpmHistory, setWpmHistory] = useState<number[]>([]);
    const [pauseStats, setPauseStats] = useState<{ stats: PauseStats; feedback: { message: string; type: "good" | "warn" | "bad" } } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs for non-state tracking
    const wordsRef = useRef<Word[]>([]);
    const isPausedRef = useRef(false);
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const sessionStartRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const wpmHistoryRef = useRef<NodeJS.Timeout | null>(null);
    const [words, setWords] = useState<Word[]>([]);
    const lastWordCountRef = useRef(0);
    const transcriptRef = useRef("");
    const interimTextRef = useRef("");
    // Persistent full transcript for filler counting — never cleared between questions
    const allTranscriptRef = useRef("");

    const reset = useCallback(() => {
        setTranscript("");
        setInterimText("");
        setElapsedTime(0);
        setWpm(0);
        setFillerCounts({});
        setPauseCount(0);
        setWpmHistory([]);
        setPauseStats(null);
        setWords([]);
        wordsRef.current = [];
        lastWordCountRef.current = 0;
        transcriptRef.current = "";
        interimTextRef.current = "";
        allTranscriptRef.current = "";
        setError(null);
        isPausedRef.current = false;
    }, []);

    // Lightweight reset: only clears the answer box text, keeps cumulative metrics
    const resetTranscriptOnly = useCallback(() => {
        setTranscript("");
        setInterimText("");
        transcriptRef.current = "";
        interimTextRef.current = "";
    }, []);

    const pauseRecording = useCallback(() => {
        isPausedRef.current = true;
    }, []);

    const resumeRecording = useCallback(() => {
        isPausedRef.current = false;
    }, []);

    const isStreamOwnerRef = useRef(false);

    const stopListening = useCallback(() => {
        setIsListening(false);
        if (wsRef.current) {
            if (wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send("stop");
            }
            wsRef.current.close();
            wsRef.current = null;
        }

        // Cleanup resources
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            // Only stop tracks if we requested them ourselves
            if (isStreamOwnerRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            mediaStreamRef.current = null;
        }
        if (timerRef.current) clearInterval(timerRef.current);
        if (wpmHistoryRef.current) clearInterval(wpmHistoryRef.current);
    }, []);

    const startListening = useCallback(async (existingStream?: MediaStream) => {
        if (isListening || wsRef.current) return;
        try {
            const now = Date.now();
            // Only reset session start on a fresh session (no prior data)
            const isContinuation = wordsRef.current.length > 0;
            if (!isContinuation) {
                sessionStartRef.current = now;
            }

            // 1. WebSocket Setup
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send("start");
                setIsListening(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.error) {
                        setError(data.error);
                        return;
                    }

                    if (data.done) {
                        setInterimText("");
                        return;
                    }

                    if (data.isFinal) {
                        const newTranscriptPart = data.transcript.trim();
                        setTranscript(prev => (prev + " " + newTranscriptPart).trim());
                        setInterimText("");

                        // Accumulate into persistent transcript for filler counting
                        allTranscriptRef.current = (allTranscriptRef.current + " " + newTranscriptPart).trim();

                        // Precise word timing from Chirp 2
                        if (data.words && Array.isArray(data.words)) {
                            const incomingWords: Word[] = data.words.map((w: { word: string; startTime: string; endTime: string }) => ({
                                word: w.word,
                                startTime: w.startTime,
                                endTime: w.endTime
                            }));
                            const updatedWords = [...wordsRef.current, ...incomingWords];
                            wordsRef.current = updatedWords;
                            setWords(updatedWords);

                            // Analysis
                            const duration = (Date.now() - sessionStartRef.current) / 1000;
                            const currentPauses = analyzePauses(wordsRef.current);
                            const currentStats = calculatePauseStats(currentPauses, duration);

                            setPauseStats({
                                stats: currentStats,
                                feedback: getPauseFeedback(currentStats)
                            });
                            setPauseCount(currentStats.totalPauses);
                        }

                        // Updated Filler Word counts from ALL transcript text (across questions)
                        const fullText = allTranscriptRef.current;
                        const counts: Record<string, number> = {};
                        const lowerText = fullText.toLowerCase();

                        FILLER_PHRASES.forEach(phrase => {
                            const regex = new RegExp(`\\b${phrase}\\b`, "gi");
                            const matches = lowerText.match(regex);
                            if (matches && matches.length > 0) counts[phrase] = matches.length;
                        });

                        FILLER_WORDS.forEach(word => {
                            const regex = new RegExp(`\\b${word}\\b`, 'g');
                            const matches = lowerText.match(regex);
                            if (matches && matches.length > 0) counts[word] = (counts[word] || 0) + matches.length;
                        });
                        setFillerCounts(counts);

                    } else {
                        setInterimText(data.transcript);
                    }
                } catch (e) {
                    console.error("Transcription message error:", e);
                }
            };

            ws.onerror = () => setError("Relay server connection failed");
            ws.onclose = () => setIsListening(false);

            // 2. Audio Capture Setup
            let stream = existingStream;
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: { channelCount: 1, sampleRate: 16000 }
                });
                isStreamOwnerRef.current = true;
            } else {
                isStreamOwnerRef.current = false;
            }
            mediaStreamRef.current = stream;

            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);

            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const input = e.inputBuffer.getChannelData(0);
                    if (isPausedRef.current) {
                        // Send silent audio to keep WS alive, but don't transcribe TTS
                        const outputLength = Math.floor(input.length / (audioCtx.sampleRate / 16000));
                        ws.send(new Int16Array(outputLength).buffer);
                    } else {
                        const pcm = downsampleToLinear16(input, audioCtx.sampleRate, 16000);
                        ws.send(pcm);
                    }
                }
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);

            // 3. Timers
            timerRef.current = setInterval(() => {
                const diff = (Date.now() - sessionStartRef.current) / 1000;
                setElapsedTime(Math.floor(diff));

                // Live WPM using persistent transcript (survives question resets)
                const currentText = (allTranscriptRef.current + " " + interimTextRef.current).trim();
                const wordCount = currentText.split(/\s+/).filter(Boolean).length;
                if (diff > 0) {
                    setWpm(Math.round((wordCount / diff) * 60));
                }
            }, 1000);

            wpmHistoryRef.current = setInterval(() => {
                const currentText = (allTranscriptRef.current + " " + interimTextRef.current).trim();
                const currentCount = currentText.split(/\s+/).filter(Boolean).length;
                const newWords = currentCount - lastWordCountRef.current;
                const intervalWpm = Math.max(0, Math.round((newWords / 5) * 60));

                setWpmHistory(prev => [...prev, intervalWpm]);
                lastWordCountRef.current = currentCount;
            }, 5000);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Initialization failed");
            stopListening();
        }
    }, [stopListening, isListening]);

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        interimTextRef.current = interimText;
    }, [interimText]);

    useEffect(() => {
        return () => {
            stopListening();
            if (wsRef.current) wsRef.current.close();
        };
    }, [stopListening]);

    return {
        isListening,
        transcript: `${transcript} ${interimText}`.trim(),
        wpm,
        elapsedTime,
        totalWords: allTranscriptRef.current.split(/\s+/).filter(Boolean).length,
        fillerCounts,
        wpmHistory,
        pauseCount,
        pauseStats,
        error,
        startListening,
        stopListening,
        pauseRecording,
        resumeRecording,
        reset,
        resetTranscriptOnly,
        words
    };
}

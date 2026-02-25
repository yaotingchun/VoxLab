"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    calculateRMS,
    detectPitch,
    calculateAudioStats,
    getAudioFeedback,
    type AudioStats
} from "@/lib/audio-analysis";

export interface UseAudioAnalysisResult {
    isRecording: boolean;
    isPaused: boolean;
    currentVolume: number;
    currentPitch: number;
    volumeSamples: number[];
    pitchSamples: number[];
    audioStats: { stats: AudioStats; feedback: { message: string; type: "good" | "warn" | "bad" } } | null;
    startAudioAnalysis: (stream: MediaStream) => Promise<void>;
    stopAudioAnalysis: () => void;
    pauseAnalysis: () => void;
    resumeAnalysis: () => void;
}

export function useAudioAnalysis(): UseAudioAnalysisResult {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Real-time metrics
    const [currentVolume, setCurrentVolume] = useState(0);
    const [currentPitch, setCurrentPitch] = useState(0);

    // Accumulated data for post-session analysis
    const [volumeSamples, setVolumeSamples] = useState<number[]>([]);
    const [pitchSamples, setPitchSamples] = useState<number[]>([]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPausedRef = useRef(false);

    const startAudioAnalysis = useCallback(async (stream: MediaStream) => {
        try {
            // Reset state
            setVolumeSamples([]);
            setPitchSamples([]);
            setCurrentVolume(0);
            setIsPaused(false);
            isPausedRef.current = false;

            // Create AudioContext
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioContext = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            // Create Source
            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            // Create Analyser
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Start Analysis Loop (100ms)
            const analysisData = new Float32Array(analyser.fftSize);

            analysisIntervalRef.current = setInterval(() => {
                if (!analyserRef.current) return;

                // Always update real-time volume for UI feedback if recording
                analyserRef.current.getFloatTimeDomainData(analysisData);
                const rms = calculateRMS(analysisData);
                setCurrentVolume(rms);

                // Only accumulate samples if not paused
                if (!isPausedRef.current) {
                    setVolumeSamples(prev => [...prev, rms]);

                    // Detect Pitch
                    const pitch = detectPitch(analysisData, 16000); // 16kHz context
                    if (pitch) {
                        setCurrentPitch(pitch);
                        setPitchSamples(prev => [...prev, pitch]);
                    } else {
                        setPitchSamples(prev => [...prev, 0]);
                    }
                } else {
                    // Reset pitch if paused
                    setCurrentPitch(0);
                }

            }, 100);

            setIsRecording(true);
        } catch (error) {
            console.error("Failed to start audio analysis:", error);
        }
    }, []);

    const stopAudioAnalysis = useCallback(() => {
        // Cleanup intervals
        if (analysisIntervalRef.current) {
            clearInterval(analysisIntervalRef.current);
            analysisIntervalRef.current = null;
        }

        // Cleanup audio nodes
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }

        setIsRecording(false);
        setIsPaused(false);
        isPausedRef.current = false;
        setCurrentVolume(0);
        setCurrentPitch(0);
    }, []);

    const pauseAnalysis = useCallback(() => {
        setIsPaused(true);
        isPausedRef.current = true;
    }, []);

    const resumeAnalysis = useCallback(() => {
        setIsPaused(false);
        isPausedRef.current = false;
    }, []);

    // Calculate final stats when recording stops or when requested
    const audioStats = useEffect(() => {
        return undefined;
    }, []) as any;

    const getAnalysis = () => {
        if (volumeSamples.length === 0) return null;
        const stats = calculateAudioStats(volumeSamples, pitchSamples);
        const feedback = getAudioFeedback(stats);
        return { stats, feedback };
    };

    /**
     * Re-start audio analysis if the stream tracks were stopped and restarted elsewhere
     */
    useEffect(() => {
        if (isRecording && sourceRef.current && sourceRef.current.mediaStream) {
            const hasActiveTrack = sourceRef.current.mediaStream.getAudioTracks().some(t => t.readyState === 'live');
            if (!hasActiveTrack) {
                console.warn("Audio stream tracks stopped. Stopping analysis.");
                stopAudioAnalysis();
            }
        }
    }, [isRecording, stopAudioAnalysis]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAudioAnalysis();
        };
    }, [stopAudioAnalysis]);

    return {
        isRecording,
        isPaused,
        currentVolume,
        currentPitch,
        volumeSamples,
        pitchSamples,
        audioStats: getAnalysis(),
        startAudioAnalysis,
        stopAudioAnalysis,
        pauseAnalysis,
        resumeAnalysis
    };
}

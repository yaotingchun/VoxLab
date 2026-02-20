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
    currentVolume: number;
    volumeSamples: number[];
    pitchSamples: number[];
    audioStats: { stats: AudioStats; feedback: { message: string; type: "good" | "warn" | "bad" } } | null;
    startAudioAnalysis: (stream: MediaStream) => Promise<void>;
    stopAudioAnalysis: () => void;
}

export function useAudioAnalysis(): UseAudioAnalysisResult {
    const [isRecording, setIsRecording] = useState(false);

    // Real-time metrics
    const [currentVolume, setCurrentVolume] = useState(0);

    // Accumulated data for post-session analysis
    const [volumeSamples, setVolumeSamples] = useState<number[]>([]);
    const [pitchSamples, setPitchSamples] = useState<number[]>([]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startAudioAnalysis = useCallback(async (stream: MediaStream) => {
        try {
            // Reset state
            setVolumeSamples([]);
            setPitchSamples([]);
            setCurrentVolume(0);

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

                // Get time domain data for RMS (Volume)
                analyserRef.current.getFloatTimeDomainData(analysisData);
                const rms = calculateRMS(analysisData);
                setCurrentVolume(rms);
                setVolumeSamples(prev => [...prev, rms]);

                // Detect Pitch
                const pitch = detectPitch(analysisData, 16000); // 16kHz context
                if (pitch) {
                    setPitchSamples(prev => [...prev, pitch]);
                } else {
                    setPitchSamples(prev => [...prev, 0]); // 0 indicates unvoiced/silence
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
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setIsRecording(false);
        setCurrentVolume(0);
    }, []);

    // Calculate final stats when recording stops or when requested
    const audioStats = useEffect(() => {
        // We calculate stats live or at the end if we want, 
        // but typically we compute them for the report.
        return undefined;
    }, []) as any; // logic moved to return

    const getAnalysis = () => {
        if (volumeSamples.length === 0) return null;
        const stats = calculateAudioStats(volumeSamples, pitchSamples);
        const feedback = getAudioFeedback(stats);
        return { stats, feedback };
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAudioAnalysis();
        };
    }, [stopAudioAnalysis]);

    return {
        isRecording,
        currentVolume,
        volumeSamples,
        pitchSamples,
        audioStats: getAnalysis(),
        startAudioAnalysis,
        stopAudioAnalysis
    };
}

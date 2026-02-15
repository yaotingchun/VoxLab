import { YIN } from "pitchfinder";

// Configuration
const FFT_SIZE = 2048;
const MIN_VOLUME_THRESHOLD = 0.01; // Ignore pitch if volume is below this (silence/noise)
const PITCH_MIN_FREQ = 70;  // 70 Hz (User requirement: Male > 85, verify limits)
const PITCH_MAX_FREQ = 400; // 400 Hz (User requirement: Female < 255, generous buffer)

// Initialize PitchFinder detector
// YIN is accurate but can be CPU intensive. AMDF is faster but less accurate.
// Given "Speech Coach" context, accuracy is preferred.
const detectPitchYin = YIN({ sampleRate: 16000 }); // We will downsample or use context rate

export interface AudioStats {
    averageVolume: number;
    volumeVariance: number;
    quietPercentage: number;

    averagePitch: number;
    pitchRange: number;
    pitchStdDev: number; // In Semitones

    isMonotone: boolean;
    isTooQuiet: boolean;
}

/**
 * Calculate Root Mean Square (RMS) - Measure of loudness
 */
export function calculateRMS(data: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
}

/**
 * Detect Pitch using YIN algorithm
 */
export function detectPitch(data: Float32Array, sampleRate: number): number | null {
    // 1. Check volume first to avoid analyzing silence
    const rms = calculateRMS(data);
    if (rms < MIN_VOLUME_THRESHOLD) return null;

    // 2. Run pitch detection
    // Note: Yin expects a Float32Array
    // We might need to re-init Yin if sample rate changes, but usually it's constant per session.
    // For optimization, we assumption strict 16kHz or 44.1kHz from the passed context.
    // However, YIN factory binds the sample rate.
    // If we want to be dynamic, we'd need to create the detector on the fly or cache it.
    // For now, let's assume standard Web Audio default (usually 44.1k or 48k) or the downsampled 16k.
    // Let's actually export a factory or class to handle state if needed.
    // START SIMPLE: Re-use the module-level detector if rate matches, else warn?
    // Actually, `pitchfinder` docs say `Yin({ sampleRate: ... })` returns a function.

    // To support dynamic sample rates from potential different microphones, 
    // we'll stick to a closure or just re-create if cheap enough. 
    // YIN initialization is just setting configs, lightweight.
    try {
        const detector = YIN({ sampleRate });
        const pitch = detector(data);

        // Filter unreasonable results
        if (pitch && pitch >= PITCH_MIN_FREQ && pitch <= PITCH_MAX_FREQ) {
            return pitch;
        }
    } catch (e) {
        console.error("Pitch detection error", e);
    }

    return null;
}

/**
 * Interpret Volume Level
 */
export function getVolumeCategory(rms: number): "quiet" | "normal" | "loud" {
    if (rms < 0.02) return "quiet";
    if (rms > 0.15) return "loud"; // Adjusted up slightly from user requirement to avoid false positives
    return "normal";
}

/**
 * Calculate Aggregate Audio Stats
 */
export function calculateAudioStats(
    volumes: number[],
    pitches: number[]
): AudioStats {
    const validPitches = pitches.filter(p => p > 0);
    const count = volumes.length;

    // Volume Stats
    const sumVol = volumes.reduce((a, b) => a + b, 0);
    const avgVol = count > 0 ? sumVol / count : 0;

    const varianceVol = count > 0
        ? volumes.reduce((a, b) => a + Math.pow(b - avgVol, 2), 0) / count
        : 0;

    const quietCount = volumes.filter(v => v < 0.02).length;
    const quietPercentage = count > 0 ? quietCount / count : 0;

    // Pitch Stats
    const pitchCount = validPitches.length;
    const sumPitch = validPitches.reduce((a, b) => a + b, 0);
    const avgPitch = pitchCount > 0 ? sumPitch / pitchCount : 0;

    const minPitch = pitchCount > 0 ? Math.min(...validPitches) : 0;
    const maxPitch = pitchCount > 0 ? Math.max(...validPitches) : 0;
    const pitchRange = maxPitch - minPitch;

    // Pitch Standard Deviation in Semitones (Logarithmic)
    // Formula: semitone = 12 * log2(freq / 440)
    let stdDevSemitones = 0;
    if (pitchCount > 1) {
        const semitones = validPitches.map(p => 12 * Math.log2(p / 440));
        const avgSemitone = semitones.reduce((a, b) => a + b, 0) / pitchCount;
        const varianceSemitone = semitones.reduce((a, b) => a + Math.pow(b - avgSemitone, 2), 0) / pitchCount;
        stdDevSemitones = Math.sqrt(varianceSemitone);
    }

    // Heuristic Classification
    // < 1.5 semitones: Monotone
    // 1.5 - 3.0 semitones: Normal
    // > 3.0 semitones: Expressive
    const isMonotone = pitchCount > 10 && stdDevSemitones < 1.5;
    const isTooQuiet = quietPercentage > 0.4; // > 40% quiet time

    return {
        averageVolume: avgVol,
        volumeVariance: varianceVol,
        quietPercentage,
        averagePitch: avgPitch,
        pitchRange,
        pitchStdDev: stdDevSemitones,
        isMonotone,
        isTooQuiet
    };
}

/**
 * Generate Feedback based on Audio Stats
 */
export function getAudioFeedback(stats: AudioStats): { message: string; type: "good" | "warn" | "bad" } {
    if (stats.isTooQuiet) {
        return {
            message: "Your volume is quite low. Try projecting your voice to fill the room.",
            type: "warn"
        };
    }

    if (stats.isMonotone) {
        return {
            message: "Your pitch variability is low (< 1.5 semitones). Try varying your intonation more to keep listener interest.",
            type: "warn"
        };
    }

    if (stats.pitchStdDev > 3.0) {
        return {
            message: "Excellent vocal variety! Your dynamic intonation is very engaging.",
            type: "good"
        };
    }

    return {
        message: "Good volume and tone consistency.",
        type: "good"
    };
}

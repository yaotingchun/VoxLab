import { SpeechClient } from '@google-cloud/speech';
// @ts-ignore - no types available
import { YIN } from 'pitchfinder';

export interface AudioAnalysisResult {
    wpm: number;
    avgPitch: number;
    pitchVariation: string;
    pauses: number;
    transcript: string;
    // New fields for DetailedSessionReport compatibility
    duration: number;
    totalWords: number;
    fillerCounts: Record<string, number>;
    wpmHistory: number[];
    words: { word: string; startTime: number; endTime: number }[];
    pauseStats: {
        stats: {
            totalPauses: number;
            breakdownCount: number;
            emphasisCount: number;
            thinkingCount: number;
            pauseRatio: number;
        };
        feedback: { message: string; type: "good" | "warn" | "bad" };
    };
    audioMetrics: {
        averageVolume: number;
        pitchRange: number;
        pitchStdDev: number;
        isMonotone: boolean;
        isTooQuiet: boolean;
        quietPercentage: number;
    };
    volumeSamples: number[];
    pitchSamples: number[];
}

// Ensure credentials exist or use default ADC
const speechClient = new SpeechClient();

function parseWav(buffer: Buffer): Float32Array {
    let offset = 12; // skip RIFF + WAVE
    while (offset < buffer.length - 8) {
        const chunkId = buffer.toString('ascii', offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);

        if (chunkId === 'data') {
            const dataOffset = offset + 8;
            const floatArray = new Float32Array(chunkSize / 2);
            for (let i = 0; i < floatArray.length; i++) {
                const int16 = buffer.readInt16LE(dataOffset + i * 2);
                floatArray[i] = int16 / 32768.0;
            }
            return floatArray;
        }
        offset += 8 + chunkSize;
    }
    return new Float32Array(0);
}

export async function analyzeAudio(wavBuffer: Buffer): Promise<AudioAnalysisResult> {
    const float32Array = parseWav(wavBuffer);
    const sampleRate = 16000;
    const duration = float32Array.length / sampleRate;

    // 1. Calculate Pitch and Volume Over Time
    const detectPitch = YIN({ sampleRate });

    // We want roughly 5 samples per second for charts (200ms chunks)
    const chunkSize = sampleRate * 0.2;

    const pitchSamples: number[] = [];
    const volumeSamples: number[] = [];

    let totalPitch = 0;
    const validPitchValues: number[] = [];

    for (let i = 0; i < float32Array.length; i += chunkSize) {
        const chunk = float32Array.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;

        // Calculate RMS Volume
        let sumSquares = 0;
        for (let j = 0; j < chunk.length; j++) {
            sumSquares += chunk[j] * chunk[j];
        }
        const rms = Math.sqrt(sumSquares / chunk.length);
        volumeSamples.push(rms);

        // Detect Pitch
        const pitch = detectPitch(chunk);
        if (pitch && pitch > 50 && pitch < 500) { // Valid human vocal range
            pitchSamples.push(pitch);
            validPitchValues.push(pitch);
            totalPitch += pitch;
        } else {
            pitchSamples.push(0); // 0 signifies unvoiced/silence
        }
    }

    const avgPitch = validPitchValues.length > 0 ? totalPitch / validPitchValues.length : 0;

    let minPitch = Infinity;
    let maxPitch = 0;
    if (validPitchValues.length > 0) {
        minPitch = Math.min(...validPitchValues);
        maxPitch = Math.max(...validPitchValues);
    }

    // Calculate Pitch Standard Deviation
    let pitchVariance = 0;
    if (validPitchValues.length > 0) {
        pitchVariance = validPitchValues.reduce((sq, n) => sq + Math.pow(n - avgPitch, 2), 0) / validPitchValues.length;
    }
    const pitchStdDev = Math.sqrt(pitchVariance);

    let pitchVariation = "Stable";
    const range = Math.max(0, maxPitch - minPitch);
    if (validPitchValues.length > 0) {
        if (range > 150) pitchVariation = "Highly Expressive";
        else if (range > 80) pitchVariation = "Expressive";
        else if (range < 30) pitchVariation = "Monotone";
    }

    const averageVolume = volumeSamples.reduce((a, b) => a + b, 0) / (volumeSamples.length || 1);
    const quietThreshold = 0.05;
    const quietCount = volumeSamples.filter(v => v < quietThreshold).length;
    const quietPercentage = volumeSamples.length > 0 ? quietCount / volumeSamples.length : 0;

    const audioMetrics = {
        averageVolume,
        pitchRange: range,
        pitchStdDev,
        isMonotone: pitchStdDev < 15, // Simple heuristic
        isTooQuiet: averageVolume < quietThreshold,
        quietPercentage
    };

    // 2. Google Cloud Speech-to-Text for WPM, Words, Transcript
    let wpm = 0;
    let transcript = "";
    const words: { startTime: number; endTime: number; word: string }[] = [];
    const fillerCounts: Record<string, number> = {};
    const FILLERS = new Set(["um", "uh", "like", "so", "you know", "actually", "basically"]);

    try {
        const audio = { content: wavBuffer.toString('base64') };
        const request = {
            audio,
            config: {
                encoding: 'LINEAR16' as const,
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                enableWordTimeOffsets: true,
                enableAutomaticPunctuation: true,
            },
        };

        const [response] = await speechClient.recognize(request);

        for (const result of response.results || []) {
            if (result.alternatives && result.alternatives[0]) {
                const alt = result.alternatives[0];
                transcript += (transcript ? " " : "") + alt.transcript;

                for (const wordInfo of alt.words || []) {
                    const startSec = parseInt(wordInfo.startTime?.seconds?.toString() || "0", 10);
                    const startNano = wordInfo.startTime?.nanos || 0;
                    const endSec = parseInt(wordInfo.endTime?.seconds?.toString() || "0", 10);
                    const endNano = wordInfo.endTime?.nanos || 0;

                    const cleanWord = (wordInfo.word || "").replace(/[^\w\s]/g, '').toLowerCase();
                    words.push({
                        word: wordInfo.word || "",
                        startTime: startSec + startNano / 1e9,
                        endTime: endSec + endNano / 1e9,
                    });

                    // Track Fillers
                    if (FILLERS.has(cleanWord)) {
                        fillerCounts[cleanWord] = (fillerCounts[cleanWord] || 0) + 1;
                    }
                }
            }
        }
    } catch (error) {
        console.error("GCP Speech Recognition failed. Falling back to simple metrics.", error);
    }

    const totalWords = words.length;

    // Calculate WPM based on duration
    wpm = duration > 0 ? Math.round((totalWords / duration) * 60) : 0;

    // 3. Pause Analysis
    let emphasisCount = 0;
    let thinkingCount = 0;
    let breakdownCount = 0;
    let totalSilenceTime = 0;

    // Add initial pause before first speaking
    if (words.length > 0 && words[0].startTime > 0.5) {
        totalSilenceTime += words[0].startTime;
    }

    for (let i = 1; i < words.length; i++) {
        const gap = words[i].startTime - words[i - 1].endTime;
        if (gap > 0) {
            totalSilenceTime += gap;

            if (gap >= 0.5 && gap < 1.0) {
                emphasisCount++;
            } else if (gap >= 1.0 && gap < 2.5) {
                thinkingCount++;
            } else if (gap >= 2.5) {
                breakdownCount++;
            }
        }
    }

    // Add trailing pause
    if (words.length > 0 && duration > words[words.length - 1].endTime) {
        totalSilenceTime += (duration - words[words.length - 1].endTime);
    }

    const totalPauses = emphasisCount + thinkingCount + breakdownCount;
    const pauseRatio = duration > 0 ? totalSilenceTime / duration : 0;

    let pauseType: "good" | "warn" | "bad" = "good";
    let pauseMessage = "Excellent pacing and use of pauses.";

    if (breakdownCount > 2) {
        pauseType = "bad";
        pauseMessage = "You had several long breakdown pauses. Try to maintain flow.";
    } else if (pauseRatio > 0.3) {
        pauseType = "warn";
        pauseMessage = "You spend a large portion of your speech in silence. Consider picking up the pace.";
    }

    const pauseStats = {
        stats: {
            totalPauses,
            breakdownCount,
            emphasisCount,
            thinkingCount,
            pauseRatio
        },
        feedback: { message: pauseMessage, type: pauseType }
    };

    // Calculate a basic WPM history proxy array for older components that might want it directly
    const wpmHistory: number[] = [];
    if (words.length > 0) {
        let currentIntervalEnd = 5;
        let wordCountInInterval = 0;

        for (let i = 0; i < words.length; i++) {
            while (words[i].startTime > currentIntervalEnd) {
                wpmHistory.push(wordCountInInterval * (60 / 5));
                wordCountInInterval = 0;
                currentIntervalEnd += 5;
            }
            wordCountInInterval++;
        }
        wpmHistory.push(wordCountInInterval * (60 / 5));
    }

    return {
        wpm,
        avgPitch,
        pitchVariation,
        pauses: totalPauses,
        transcript,
        duration,
        totalWords,
        fillerCounts,
        wpmHistory,
        words,
        pauseStats,
        audioMetrics,
        volumeSamples,
        pitchSamples
    };
}

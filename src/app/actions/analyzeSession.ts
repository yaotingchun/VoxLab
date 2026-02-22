"use server";

import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { z } from 'zod';
import { PauseStats } from '@/lib/pause-analysis';

interface SessionData {
    duration: number; // in seconds
    averageScore: number;
    issueCounts: Record<string, number>; // e.g., { HEAD_TILT: 5, SLOUCHING: 2 }
    // New Face Metrics
    faceMetrics: {
        averageEngagement: number;
        smilePercentage: number; // % of time smiling
        blinkRateAverage: number;
        eyeContactScore: number;
    };
    speechMetrics?: {
        totalWords: number;
        fillerCounts: Record<string, number>;
        pauseCount: number;
        wpmHistory: number[];
        pauseStats?: PauseStats | null;
    };
    audioMetrics?: {
        averageVolume?: number;
        averagePitch?: number;
        pitchRange?: number;
        isMonotone?: boolean;
        isTooQuiet?: boolean;
        avgVolume?: number;
        avgPitch?: number;
        volumeRange?: number;
    };
}

export async function analyzeSession(data: SessionData) {
    try {
        const prompt = `
        You are an expert Presentation, Vocal, and Posture Coach.
        Analyze the following session data:

        - Duration: ${data.duration} seconds
        - Overall Score: ${Math.round(data.averageScore)}/100
        
        - Speech Analysis:
        - Total Words: ${data.speechMetrics?.totalWords || 0}
        - Filler Words: ${data.speechMetrics ? Object.entries(data.speechMetrics.fillerCounts).map(([k, v]) => `${k}: ${v}`).join(', ') : 'None'}
        - Pauses Detected: ${data.speechMetrics?.pauseCount || 0}
        - Pace Stability: ${data.speechMetrics?.wpmHistory.length ? 'Varied' : 'Stable'} (History: ${data.speechMetrics?.wpmHistory.slice(0, 10).join(', ')}...)

        - Posture Issues:
        ${Object.entries(data.issueCounts).map(([k, v]) => `  - ${k}: ${v} detected`).join('\n')}

        - Facial Expressions:
        - Engagement: ${data.faceMetrics.averageEngagement}%
        - Smiled: ${data.faceMetrics.smilePercentage}% of the time
        - Blink Rate: ${data.faceMetrics.blinkRateAverage} BPM
        - Eye Contact: ${data.faceMetrics.eyeContactScore}%

        - Vocal & Audio Metrics:
        - Average Volume: ${data.audioMetrics?.avgVolume?.toFixed(2) || data.audioMetrics?.averageVolume?.toFixed(2) || 'N/A'} dBFS
        - Average Pitch: ${data.audioMetrics?.avgPitch?.toFixed(2) || data.audioMetrics?.averagePitch?.toFixed(2) || 'N/A'} Hz
        - Pitch Range: ${data.audioMetrics?.pitchRange?.toFixed(2) || 'N/A'} Hz
        - Monotone: ${data.audioMetrics?.isMonotone ? 'Yes' : 'No'}
        - Too Quiet: ${data.audioMetrics?.isTooQuiet ? 'Yes' : 'No'}

        Provide a "Gemini AI Coach" summary.
        1. A brief, 2-3 sentence analysis of their overall performance, encompassing their script, posture, and VOCAL delivery.
        2. Three specific, actionable "Quick Tips" to improve next time (make sure to include vocal tips if needed).
        3. An objective 'score' from 0 to 100 evaluating their overall performance across all these pillars. Make it tough but fair.
        `;

        const { object } = await generateObject({
            model: vertex('gemini-2.5-pro'),
            schema: z.object({
                summary: z.string().describe('A brief, 2-3 sentence analysis of their performance'),
                tips: z.array(z.string()).describe('Three specific, actionable "Quick Tips" to improve next time'),
                score: z.number().min(0).max(100).describe('An objective score from 0 to 100 evaluating their overall performance'),
            }),
            prompt: prompt,
        });

        return object;

    } catch (error: any) {
        console.error("Vertex Analysis Error Detailed:", JSON.stringify(error, null, 2));
        if (error.message) console.error("Error Message:", error.message);
        return { error: `Failed to generate analysis: ${error.message || "Unknown error"}` };
    }
}

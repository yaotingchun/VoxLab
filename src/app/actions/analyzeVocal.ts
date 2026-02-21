"use server";

import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { z } from 'zod';
import { PauseStats } from '@/lib/pause-analysis';

interface VocalData {
    speechMetrics?: {
        totalWords: number;
        fillerCounts: Record<string, number>;
        pauseCount: number;
        wpmHistory: number[];
        pauseStats?: PauseStats | null;
    };
    audioMetrics?: {
        averageVolume: number;
        averagePitch: number;
        pitchRange: number;
        isMonotone: boolean;
        isTooQuiet: boolean;
    };
}

export async function analyzeVocal(data: VocalData) {
    try {
        const prompt = `
        You are an expert Vocal Coach.
        Analyze the following vocal session data:
        
        - Speech Analysis:
        - Total Words: ${data.speechMetrics?.totalWords || 0}
        - Filler Words: ${data.speechMetrics ? Object.entries(data.speechMetrics.fillerCounts).map(([k, v]) => `${k}: ${v}`).join(', ') : 'None'}
        - Pauses Detected: ${data.speechMetrics?.pauseCount || 0}
        - Pace Stability: ${data.speechMetrics?.wpmHistory.length ? 'Varied' : 'Stable'} (History: ${data.speechMetrics?.wpmHistory.slice(0, 10).join(', ')}...)

        - Audio Metrics:
        - Volume: ${data.audioMetrics?.isTooQuiet ? 'Too Quiet' : 'Good Volume'}
        - Pitch Variety: ${data.audioMetrics?.isMonotone ? 'Monotone' : 'Expressive'}
        - Pitch Range: ${data.audioMetrics?.pitchRange || 0} st

        Provide a "Gemini AI Vocal Coach" summary.
        1. A brief, 2-3 sentence analysis of their vocal performance (Tone: Professional, Encouraging, Insightful). Focus mostly on pacing, fillers, pauses, and pitch.
        2. Three specific, actionable "Quick Tips" to improve their vocal delivery next time.
        3. An objective 'score' from 0 to 100 evaluating solely their vocal delivery based on clarity, pace stability, and tonal variety. Make it tough but fair.
        `;

        const { object } = await generateObject({
            model: vertex('gemini-2.5-flash'),
            schema: z.object({
                summary: z.string().describe('A brief, 2-3 sentence analysis of their vocal performance'),
                tips: z.array(z.string()).describe('Three specific, actionable "Quick Tips" to improve voice next time'),
                score: z.number().min(0).max(100).describe('An objective vocal score from 0 to 100'),
            }),
            prompt: prompt,
        });

        return object;

    } catch (error: any) {
        console.error("Vertex Analysis Error Detailed:", JSON.stringify(error, null, 2));
        return { error: `Failed to generate analysis: ${error.message || "Unknown error"}` };
    }
}

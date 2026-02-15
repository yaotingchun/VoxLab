"use server";

import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { z } from 'zod';

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
    }
}

export async function analyzeSession(data: SessionData) {
    try {
        const prompt = `
        You are an expert Presentation and Posture Coach.
        Analyze the following session data:

        - Duration: ${data.duration} seconds
        - Overall Score: ${Math.round(data.averageScore)}/100
        
        - Posture Issues:
        ${Object.entries(data.issueCounts).map(([k, v]) => `  - ${k}: ${v} detected`).join('\n')}

        - Facial Expressions:
        - Engagement: ${data.faceMetrics.averageEngagement}%
        - Smiled: ${data.faceMetrics.smilePercentage}% of the time
        - Blink Rate: ${data.faceMetrics.blinkRateAverage} BPM
        - Eye Contact: ${data.faceMetrics.eyeContactScore}%

        Provide a "Gemini AI Coach" summary.
        1. A brief, 2-3 sentence analysis of their performance (Tone: Professional, Encouraging, Insightful).
        2. Three specific, actionable "Quick Tips" to improve next time.
        `;

        const { object } = await generateObject({
            model: vertex('gemini-2.5-pro'),
            schema: z.object({
                summary: z.string().describe('A brief, 2-3 sentence analysis of their performance'),
                tips: z.array(z.string()).describe('Three specific, actionable "Quick Tips" to improve next time'),
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

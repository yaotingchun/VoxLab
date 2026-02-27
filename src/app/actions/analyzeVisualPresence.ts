"use server";

import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { z } from 'zod';
import { analyzePosture } from './analyzePosture';

interface VisualPresenceData {
    duration: number; // in seconds
    averageScore: number;
    issueCounts: Record<string, number>;
    faceMetrics: {
        averageEngagement: number;
        smilePercentage: number;
        blinkRateAverage: number;
        eyeContactScore: number;
    };
}

export async function analyzeVisualPresence(data: VisualPresenceData) {
    try {
        const prompt = `
        You are an expert AI Visual Presence & Body Language Coach.
        Analyze the following visual performance data:

        - Session Duration: ${data.duration} seconds
        - Technical Performance Score: ${Math.round(data.averageScore)}/100

        - Body Language & Posture Issues:
        ${Object.entries(data.issueCounts).map(([k, v]) => `  - ${k}: ${v} detected`).join('\n')}

        - Facial Engagement Metrics:
        - Overall Engagement: ${data.faceMetrics.averageEngagement}%
        - Smiled: ${data.faceMetrics.smilePercentage}% of the time
        - Blink Rate: ${data.faceMetrics.blinkRateAverage} BPM
        - Eye Contact Accuracy: ${data.faceMetrics.eyeContactScore}%

        Provide a "Visual Coach" summary focusing on non-verbal communication.
        1. A brief, 2-3 sentence analysis of their visual presence, focusing on how their physical delivery affects their authority and engagement. 
        2. Three specific, actionable "Visual Quick Tips" to improve body language or facial expressions next time.
        3. An objective 'visualScore' from 0 to 100 evaluating their non-verbal performance.
        
        CRITICAL RULES:
        - Focus ONLY on visual presence. 
        - Do not mention voice, speech, or content.
        - Be direct and high-impact.
        `;

        const { object } = await generateObject({
            model: vertex('gemini-2.5-flash'), // Use a fast model for real-time coach feel
            schema: z.object({
                summary: z.string().describe('A brief analysis of their visual presence'),
                tips: z.array(z.string()).describe('Three actionable visual tips'),
                visualScore: z.number().min(0).max(100).describe('Visual presence score'),
            }),
            prompt: prompt,
        });

        // Use the existing analyzePosture logic to get detailed posture breakdowns
        const postureSummary = await analyzePosture({
            issueCounts: data.issueCounts,
            faceMetrics: data.faceMetrics
        });

        return {
            ...object,
            score: object.visualScore,
            postureSummary: 'error' in (postureSummary || {}) ? null : postureSummary,
            vocalSummary: null, // Always null for visual-only mode
        };

    } catch (error: any) {
        console.error("Visual Presence Analysis Error:", error);
        return { error: `Failed to generate visual analysis: ${error.message || "Unknown error"}` };
    }
}

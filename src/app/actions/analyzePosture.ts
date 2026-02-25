"use server";

import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { z } from 'zod';

interface PostureData {
    issueCounts: Record<string, number>;
    faceMetrics: {
        averageEngagement: number;
        smilePercentage: number;
        blinkRateAverage: number;
        eyeContactScore: number;
    };
}

export async function analyzePosture(data: PostureData) {
    try {
        const prompt = `
        You are an expert Body Language and Posture Coach.
        Analyze the following physical presence data:

        - Posture Issues:
        ${Object.entries(data.issueCounts).length > 0 ? Object.entries(data.issueCounts).map(([k, v]) => `  - ${k}: ${v} occurrences detected`).join('\n') : "No significant posture issues detected."}

        - Facial Expressions:
        - Engagement: ${data.faceMetrics.averageEngagement}%
        - Smiled: ${data.faceMetrics.smilePercentage}% of the time
        - Blink Rate: ${data.faceMetrics.blinkRateAverage} BPM
        - Eye Contact: ${data.faceMetrics.eyeContactScore}%

        Provide a "Gemini AI Posture Coach" summary.
        1. A brief, 2-3 sentence analysis of their physical performance (Tone: Professional, Encouraging, Insightful). Focus on body language, alignment, and facial expressions.
        2. Three specific, actionable "Quick Tips" to improve physical presence next time.
        3. An objective 'score' from 0 to 100 evaluating solely their posture, eye contact, and engagement. 
        
        CRITICAL RULES FOR SCORING:
        - If engagement is 0 or eye contact is 0, the score MUST be close to 0.
        - Heavily penalize specific posture issues.
        - If no data is detected, the score MUST be 0.
        `;

        const { object } = await generateObject({
            model: vertex('gemini-2.5-flash'),
            schema: z.object({
                summary: z.string().describe('A brief, 2-3 sentence analysis of their physical presence'),
                tips: z.array(z.string()).describe('Three specific, actionable "Quick Tips" to improve body language next time'),
                score: z.number().min(0).max(100).describe('An objective posture and body language score from 0 to 100'),
            }),
            prompt: prompt,
        });

        return object;

    } catch (error: any) {
        console.error("Vertex Analysis Error Detailed:", JSON.stringify(error, null, 2));
        return { error: `Failed to generate analysis: ${error.message || "Unknown error"}` };
    }
}

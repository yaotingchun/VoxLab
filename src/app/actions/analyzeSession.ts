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
    rubricText?: string;
    transcript?: string;
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
        - Transcript: "${data.transcript || 'N/A'}"

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

        ${data.rubricText ? `
        CRITICAL: EVALUATE BASED ON THIS RUBRIC:
        "${data.rubricText}"
        
        INSTRUCTIONS FOR RUBRIC EVALUATION:
        1. Parse the rubric text above to identify distinct evaluation criteria (e.g., "Clarity", "Body Language", "Structure").
        2. Evaluate each criterion based on the transcript and performance metrics provided.
        3. Assign a fulfillment status to each: "full", "partial", or "none".
        4. Provide specific feedback for each criterion, citing evidence from the session (e.g., quotes from transcript or specific posture metrics).
        5. Provide an overall assessment of how well the user met the rubric's goals.
        ` : ""}
        
        Provide a "Gemini AI Coach" summary.
        1. A brief, 2-3 sentence analysis of their overall performance, encompassing their script, posture, and VOCAL delivery.
        2. Three specific, actionable "Quick Tips" to improve next time (make sure to include vocal tips if needed).
        3. An objective 'score' from 0 to 100 evaluating their overall performance across all these pillars. Make it tough but fair.
        
        ${data.rubricText ? `
        4. Provide a rubric-specific score (0-100) reflecting the average fulfillment of the identified criteria.
        5. Assess the "Alignment Level" (high, medium, low) based on the overall fulfillment.
        ` : ""}
        `;

        const { object } = await generateObject({
            model: vertex('gemini-2.0-flash'), // Using faster model for complex multi-pillar analysis
            schema: z.object({
                summary: z.string().describe('A brief, 2-3 sentence analysis of their performance'),
                tips: z.array(z.string()).describe('Three specific, actionable "Quick Tips" to improve next time'),
                score: z.number().min(0).max(100).describe('An objective score from 0 to 100 evaluating their overall performance'),
                rubricFeedback: z.object({
                    score: z.number().min(0).max(100),
                    alignmentLevel: z.enum(["high", "medium", "low"]),
                    overallAssessment: z.string().describe('A concise summary of how well the rubric goals were met'),
                    criteriaBreakdown: z.array(z.object({
                        criterion: z.string().describe('The name of the rubric criterion'),
                        fulfillment: z.enum(["full", "partial", "none"]),
                        feedback: z.string().describe('Detailed feedback for this specific criterion'),
                        evidence: z.string().describe('Direct evidence from the session (transcript or metrics) supporting the fulfillment status')
                    }))
                }).optional().nullable()
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

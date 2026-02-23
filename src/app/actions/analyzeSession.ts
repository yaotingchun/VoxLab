"use server";

import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { z } from 'zod';
import { PauseStats } from '@/lib/pause-analysis';

interface SessionData {
    duration: number; // in seconds
    averageScore: number;
    issueCounts: Record<string, number>; // e.g., { HEAD_TILT: 5, SLOUCHING: 2 }
    topic?: string | null; // The speaking topic chosen before the session
    transcript?: string | null; // The full speech transcript
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
        const hasTopic = data.topic && data.topic.trim().length > 0;
        const hasTranscript = data.transcript && data.transcript.trim().length > 0;

        const topicSection = hasTopic ? `
        --- SPEAKING TOPIC ---
        The user chose to practice speaking about: "${data.topic}"
        ${hasTranscript ? `
        --- FULL SPEECH TRANSCRIPT ---
        "${data.transcript}"
        ` : '(No transcript captured)'}
        ` : '';

        const topicInstructions = hasTopic ? `
        4. **Topic Relevance Analysis** (CRITICAL — this is the most important part):
           - Evaluate how well the speaker's content relates to the assigned topic: "${data.topic}".
           - Identify specific points or arguments the speaker successfully addressed.
           - Highlight important angles, perspectives, or sub-topics that were MISSED and could strengthen the speech.
           - Provide a "relevanceScore" from 0 to 100 rating how well the speech content matched and covered the topic.
           - Give 2-3 concrete "contentSuggestions" — specific points, examples, statistics, or arguments the speaker could add to make the speech more compelling and comprehensive on this topic.
        ` : '';

        const prompt = `
        You are an expert Presentation, Vocal, and Posture Coach.
        Analyze the following session data:

        - Duration: ${data.duration} seconds
        - Overall Score: ${Math.round(data.averageScore)}/100
        ${topicSection}
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
        1. A brief, 2-3 sentence analysis of their overall performance, encompassing their script, posture, and VOCAL delivery.${hasTopic ? ' Specifically mention how well their content addressed the topic.' : ''}
        2. Three specific, actionable "Quick Tips" to improve next time (make sure to include vocal tips if needed).${hasTopic ? ' At least one tip should be about content/topic coverage.' : ''}
        3. An objective 'score' from 0 to 100 evaluating their overall performance across all these pillars. Make it tough but fair.
        ${topicInstructions}
        `;

        // Build schema dynamically based on whether a topic was provided
        const baseSchema = z.object({
            summary: z.string().describe('A brief, 2-3 sentence analysis of their performance'),
            tips: z.array(z.string()).describe('Three specific, actionable "Quick Tips" to improve next time'),
            score: z.number().min(0).max(100).describe('An objective score from 0 to 100 evaluating their overall performance'),
            ...(hasTopic ? {
                topicAnalysis: z.object({
                    relevanceScore: z.number().min(0).max(100).describe('How well the speech content matched and covered the assigned topic (0-100)'),
                    coveredPoints: z.array(z.string()).describe('Key points or arguments the speaker successfully addressed about the topic'),
                    missedAngles: z.array(z.string()).describe('Important perspectives, angles, or sub-topics the speaker missed'),
                    contentSuggestions: z.array(z.string()).describe('2-3 concrete suggestions for points, examples, or arguments to add'),
                }).describe('Detailed analysis of how the speech content relates to the assigned topic'),
            } : {}),
        });

        const { object } = await generateObject({
            model: vertex('gemini-2.5-pro'),
            schema: baseSchema,
            prompt: prompt,
        });

        return object;

    } catch (error: any) {
        console.error("Vertex Analysis Error Detailed:", JSON.stringify(error, null, 2));
        if (error.message) console.error("Error Message:", error.message);
        return { error: `Failed to generate analysis: ${error.message || "Unknown error"}` };
    }
}

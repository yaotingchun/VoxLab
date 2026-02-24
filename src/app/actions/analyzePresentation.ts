"use server";

import { generateObject } from 'ai';
import { vertex } from '@ai-sdk/google-vertex';
import { z } from 'zod';
import { PauseStats } from '@/lib/pause-analysis';

interface SessionData {
    duration: number; // in seconds
    averageScore: number;
    issueCounts: Record<string, number>;
    topic?: string | null;
    transcript?: string | null;
    faceMetrics: {
        averageEngagement: number;
        smilePercentage: number;
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
    // Presentation specific metrics
    slideData?: { base64: string; type?: string; name?: string };
    rubricData?: { base64: string; type?: string; name?: string };
}

export async function analyzePresentation(data: SessionData) {
    try {
        const hasTopic = data.topic && data.topic.trim().length > 0;
        const hasTranscript = data.transcript && data.transcript.trim().length > 0;
        const hasSlides = !!data.slideData;
        const hasRubric = !!data.rubricData;

        // Build the system prompt
        let promptText = `
        You are an expert Presentation, Vocal, and Posture Coach.
        Analyze the following presentation session data:

        - Duration: ${data.duration} seconds
        - Overall Score: ${Math.round(data.averageScore)}/100
        
        ${hasTopic ? `--- SPEAKING TOPIC ---\nThe user chose to present on: "${data.topic}"\n` : ''}

        - Speech Analysis:
          - Total Words: ${data.speechMetrics?.totalWords || 0}
          - Filler Words: ${data.speechMetrics ? Object.entries(data.speechMetrics.fillerCounts).map(([k, v]) => `${k}: ${v}`).join(', ') : 'None'}
          - Pauses Detected: ${data.speechMetrics?.pauseCount || 0}
          - Pace Stability: ${data.speechMetrics?.wpmHistory.length ? 'Varied' : 'Stable'}

        - Posture Issues:
          ${Object.entries(data.issueCounts).map(([k, v]) => `- ${k}: ${v} detected`).join('\n          ')}

        - Facial Expressions:
          - Engagement: ${data.faceMetrics.averageEngagement}%
          - Smiled: ${data.faceMetrics.smilePercentage}% of the time
          - Blink Rate: ${data.faceMetrics.blinkRateAverage} BPM
          - Eye Contact: ${data.faceMetrics.eyeContactScore}%

        - Vocal & Audio Metrics:
          - Average Volume: ${data.audioMetrics?.avgVolume?.toFixed(2) || data.audioMetrics?.averageVolume?.toFixed(2) || 'N/A'} dBFS
          - Average Pitch: ${data.audioMetrics?.avgPitch?.toFixed(2) || data.audioMetrics?.averagePitch?.toFixed(2) || 'N/A'} Hz
          - Monotone: ${data.audioMetrics?.isMonotone ? 'Yes' : 'No'}
          - Too Quiet: ${data.audioMetrics?.isTooQuiet ? 'Yes' : 'No'}

        --- FULL SPEECH TRANSCRIPT ---
        ${hasTranscript ? `"${data.transcript}"` : '(No transcript captured)'}
        `;

        if (hasSlides) {
            promptText += `\n\n**SLIDE ALIGNMENT TASK**: I have attached the presentation slides document. Your job is to compare the given speech transcript against the key points in the slides. Identify whether the speaker successfully covered the main points from the slides.`;
        }

        if (hasRubric) {
            promptText += `\n\n**RUBRIC EVALUATION TASK**: I have also attached a grading rubric. You must evaluate the speech transcript against this rubric and score their performance based strictly on the rubric criteria.`;
        }

        promptText += `
        
        Provide a detailed "Gemini AI Coach" summary based on all the data above.
        1. A brief, 2-3 sentence analysis of their overall delivery, encompassing script, posture, and VOCAL delivery.
        2. Three specific, actionable "Quick Tips" to improve next time.
        3. An objective 'score' from 0 to 100 evaluating their overall performance.
        `;

        // Helper to strip the Next.js/Browser Data URI prefix if present
        const stripPrefix = (b64: string) => {
            const match = b64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*?,(.*)/);
            return match ? match[2] : b64;
        };

        const userContent: any[] = [{ type: 'text', text: promptText }];

        // Add Slides Document
        if (data.slideData) {
            userContent.push({
                type: 'file',
                mediaType: data.slideData.type || 'application/pdf',
                data: Buffer.from(stripPrefix(data.slideData.base64), 'base64'),
            });
        }

        // Add Rubric Document
        if (data.rubricData) {
            userContent.push({
                type: 'file',
                mediaType: data.rubricData.type || 'application/pdf',
                data: Buffer.from(stripPrefix(data.rubricData.base64), 'base64'),
            });
        }

        const messages: any[] = [
            {
                role: 'user',
                content: userContent,
            }
        ];

        // Define Zod Schema
        let schemaObject: any = {
            summary: z.string().describe('A brief, 2-3 sentence analysis of their performance'),
            tips: z.array(z.string()).describe('Three specific, actionable "Quick Tips" to improve next time'),
            score: z.number().min(0).max(100).describe('An objective score from 0 to 100 evaluating their overall performance'),
        };

        if (hasSlides) {
            schemaObject.slideAnalysis = z.object({
                coveredPoints: z.array(z.string()).describe('Key points from the slides that the speaker successfully addressed'),
                missedPoints: z.array(z.string()).describe('Important points present in the slides that the speaker missed entirely in the transcript'),
                alignmentScore: z.number().min(0).max(100).describe('Score evaluating how well the speech matched the slides content'),
                feedback: z.string().describe('1-2 sentences summarizing slide alignment feedback')
            }).describe('Detailed analysis of how the speech content aligns with the provided slides');
        }

        if (hasRubric) {
            schemaObject.rubricAnalysis = z.object({
                rubricScore: z.number().min(0).max(100).describe('An estimated score (out of 100) based strictly on the provided rubric document'),
                strengths: z.array(z.string()).describe('Areas where the speaker scored highly according to the rubric criteria'),
                weaknesses: z.array(z.string()).describe('Areas where the speaker lost points according to the rubric criteria'),
                feedback: z.string().describe('Detailed feedback explaining the rubric evaluation')
            }).describe('Evaluation of the speech against the provided grading rubric');
        }

        const fullSchema = z.object(schemaObject);

        const { object } = await generateObject({
            model: vertex('gemini-2.5-flash'),
            schema: fullSchema,
            // @ts-ignore - The Vercel AI signature accepts generic System/User messages
            messages: messages
        });

        return object;

    } catch (error: any) {
        console.error("Vertex Presentation Analysis Error:", error);
        return { error: `Failed to generate presentation analysis: ${error.message || "Unknown error"}` };
    }
}

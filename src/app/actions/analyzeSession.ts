"use server";

import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { z } from 'zod';
import { PauseStats } from '@/lib/pause-analysis';
import { analyzeVocal } from './analyzeVocal';
import { analyzePosture } from './analyzePosture';

interface SessionData {
    duration: number; // in seconds
    averageScore: number;
    issueCounts: Record<string, number>; // e.g., { HEAD_TILT: 5, SLOUCHING: 2 }
    topic?: string | null; // The speaking topic chosen before the session
    transcript?: string | null; // The full speech transcript
    materialContext?: string; // New field for Lecture Mode
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
}

export async function analyzeSession(data: SessionData) {
    try {
        const hasTopic = data.topic && data.topic.trim().length > 0;
        const hasTranscript = data.transcript && data.transcript.trim().length > 0;
        const hasMaterial = data.materialContext && data.materialContext.trim().length > 0;

        const topicSection = hasTopic ? `
        --- SPEAKING TOPIC ---
        The user chose to practice speaking about: "${data.topic}"
        ${hasMaterial ? `
        --- TEACHING MATERIAL CONTEXT ---
        This material was provided by the user as their guide/curriculum:
        "${data.materialContext?.slice(0, 5000)}" // Truncate if too long
        ` : ""}
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

        const lectureInstructions = hasMaterial ? `
        5. **Lecture & Teaching Analysis** (LECTURE MODE):
           - Compare the transcript against the provided Teaching Material.
           - **Concept Clarity**: How well did the speaker explain the core concepts from the material?
           - **Student Perspective**: Identify 1-2 points in the speaker's explanation that might still be confusing for someone who hasn't read the material.
           - **Analogies**: Suggest 1-2 powerful analogies that could help explain the most complex parts of the material more effectively. 
           - Provide a "teachingScore" from 0 to 100 rating their clarity as an instructor.
        ` : '';

        const prompt = `
        You are an expert Presentation, Vocal, and Posture Coach${hasMaterial ? " and an experienced Instructional Designer" : ""}.
        Analyze the following session data:

        - Duration: ${data.duration} seconds
        - Overall Score: ${Math.round(data.averageScore)}/100
        ${topicSection}
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
        1. A brief, 2-3 sentence analysis of their overall performance, encompassing their script, posture, and VOCAL delivery.${hasTopic ? ' Specifically mention how well their content addressed the topic.' : ''}
        2. Three specific, actionable "Quick Tips" to improve next time (make sure to include vocal tips if needed).${hasTopic ? ' At least one tip should be about content/topic coverage.' : ''}
        3. An objective 'score' from 0 to 100 evaluating their overall performance (preliminary score).
        
        CRITICAL RULES FOR SCORING:
        - If Total Words is 0, the content score MUST be 0.
        - If no posture issues are detected but engagement is 0, posture score MUST reflect this.
        - Be tough and eliminate "participation points".
        
        ${data.rubricText ? `
        4. Provide a rubric-specific score (0-100) reflecting the average fulfillment of the identified criteria.
        5. Assess the "Alignment Level" (high, medium, low) based on the overall fulfillment.
        ` : ""}
        ${topicInstructions}
        ${lectureInstructions}
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
            ...(hasMaterial ? {
                lectureAnalysis: z.object({
                    teachingScore: z.number().min(0).max(100).describe('Score for clarity and pedagogical effectiveness'),
                    clarityFeedback: z.string().describe('Feedback on how well they explained material'),
                    potentialConfusion: z.array(z.string()).describe('Specific points that might confuse students'),
                    analogies: z.array(z.string()).describe('Suggested analogies to improve explanation of complex parts'),
                }).describe('Analysis of teaching effectiveness relative to provided material'),
            } : {}),
        });

        const { object } = await generateObject({
            model: vertex('gemini-2.5-pro'),
            schema: baseSchema,
            prompt: prompt,
        });

        // Generate specific sub-summaries for UI tabs
        const vocalSummary = await analyzeVocal({
            speechMetrics: data.speechMetrics,
            audioMetrics: data.audioMetrics as any
        });
        const postureSummary = await analyzePosture({
            issueCounts: data.issueCounts,
            faceMetrics: data.faceMetrics
        });

        // ── Programmatic Weighted Scoring ─────────────────────────────────────
        // 50% Content, 25% Vocal, 25% Posture
        const contentScore = hasMaterial
            ? ((object as any).lectureAnalysis?.teachingScore || object.score)
            : (hasTopic ? ((object as any).topicAnalysis?.relevanceScore || object.score) : object.score);

        const vocalScore = (vocalSummary && !('error' in vocalSummary)) ? (vocalSummary as any).score : 0;
        const postureScore = (postureSummary && !('error' in postureSummary)) ? (postureSummary as any).score : 0;

        const calculatedOverallScore = Math.round(
            (contentScore * 0.50) +
            (vocalScore * 0.25) +
            (postureScore * 0.25)
        );

        return {
            ...object,
            score: calculatedOverallScore, // Overwrite with programmatic score
            vocalSummary: 'error' in (vocalSummary || {}) ? null : vocalSummary,
            postureSummary: 'error' in (postureSummary || {}) ? null : postureSummary,
        };

    } catch (error: any) {
        console.error("Vertex Analysis Error Detailed:", JSON.stringify(error, null, 2));
        if (error.message) console.error("Error Message:", error.message);
        return { error: `Failed to generate analysis: ${error.message || "Unknown error"}` };
    }
}

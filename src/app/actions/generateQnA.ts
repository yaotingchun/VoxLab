"use server";

import { generateObject } from 'ai';
import { vertex } from '@ai-sdk/google-vertex';
import { z } from 'zod';

interface GenerateQnAData {
    transcript: string;
    slideData?: { base64: string; type?: string; name?: string };
}

export async function generateQnA(data: GenerateQnAData) {
    try {
        const hasTranscript = data.transcript && data.transcript.trim().length > 0;
        const hasSlides = !!data.slideData;

        let promptText = `
        You are an expert Presentation Coach running a Q&A session.
        The user has just finished delivering a presentation. Your task is to generate 3 relevant, thoughtful questions to ask the speaker.
        
        The questions should challenge them to elaborate on their points, defend their arguments, or clarify any complex topics they presented.
        Do NOT generate multiple choice questions. Generate open-ended questions.

        --- FULL SPEECH TRANSCRIPT ---
        ${hasTranscript ? `"${data.transcript}"` : '(No transcript captured)'}
        `;

        if (hasSlides) {
            promptText += `\n\n**SLIDE CONTEXT**: I have attached the presentation slides. Please ensure your questions draw from both what they said in the transcript AND the content of the slides.`;
        }

        promptText += `\n\nReturn EXACTLY 3 questions as a JSON array of strings.`;

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

        const messages: any[] = [
            {
                role: 'user',
                content: userContent,
            }
        ];

        const { object } = await generateObject({
            model: vertex('gemini-2.5-flash'),
            schema: z.object({
                questions: z.array(z.string()).length(3).describe('An array of 3 thoughtful questions for the speaker.')
            }),
            // @ts-ignore
            messages: messages
        });

        return object.questions;

    } catch (error: any) {
        console.error("Vertex QnA Generation Error:", error);
        return { error: `Failed to generate QnA: ${error.message || "Unknown error"}` };
    }
}

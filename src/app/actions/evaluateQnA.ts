"use server";

import { generateObject } from 'ai';
import { vertex } from '@ai-sdk/google-vertex';
import { z } from 'zod';

interface QnAPair {
    question: string;
    userAnswer: string;
}

interface EvaluateQnAData {
    qnaPairs: QnAPair[];
    slideData?: { base64: string; type?: string; name?: string };
}

export async function evaluateQnA(data: EvaluateQnAData) {
    try {
        const hasSlides = !!data.slideData;

        let promptText = `
        You are an expert Presentation Coach.
        The user has just completed a Q&A session after their presentation.
        Evaluate their answers to the following questions.

        For each question, provide:
        1. An 'idealAnswer' (a concise, strong example answer demonstrating technical mastery).
        2. A 'relevanceScore' from 0-100 using these STRICT guidelines:
           - 0-30: Answer is vague, generic (e.g., "we will do this later"), or fails to address the specific technical components of the question.
           - 31-60: Answer is relevant but lacks depth, "how-to" logic, or specific technical strategies.
           - 61-85: Answer is strong, addresses most parts of the question, and provides clear logic.
           - 86-100: Exceptional answer that demonstrates deep understanding, specific data structures, and structural clarity (like the STAR method).

        BE TOUGH. If an answer is just a "roadmap" statement without explaining the strategy, it should NOT score above 40.

        Here are the Q&A pairs:
        ${data.qnaPairs.map((pair, index) => `
        --- Question ${index + 1} ---
        Q: ${pair.question}
        User's Answer: ${pair.userAnswer.trim() ? `"${pair.userAnswer}"` : '(No audible answer recorded)'}
        `).join('\n')}
        `;

        if (hasSlides) {
            promptText += `\n\n**SLIDE CONTEXT**: I have attached the presentation slides. Please consider the slide content when determining the ideal answers and scoring relevance.`;
        }

        // Helper to strip the Next.js/Browser Data URI prefix if present
        const stripPrefix = (b64: string) => {
            const match = b64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*?,(.*)/);
            return match ? match[2] : b64;
        };

        const userContent: any[] = [{ type: 'text', text: promptText }];

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
                evaluations: z.array(z.object({
                    idealAnswer: z.string().describe('A strong, concise example of how they could have answered.'),
                    relevanceScore: z.number().min(0).max(100).describe('Score from 0-100 on how relevant and effective their answer was.')
                })).length(data.qnaPairs.length).describe('Evaluations for each of the Q&A pairs in the exact same order.')
            }),
            // @ts-ignore
            messages: messages
        });

        return object.evaluations;

    } catch (error: any) {
        console.error("Vertex QnA Evaluation Error:", error);
        return { error: `Failed to evaluate QnA: ${error.message || "Unknown error"}` };
    }
}

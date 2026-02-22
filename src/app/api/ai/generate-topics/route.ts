import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { mode, category } = await req.json();

        if (mode === 'categories') {
            const { object } = await generateObject({
                model: vertex('gemini-2.5-flash'),
                schema: z.object({
                    categories: z.array(z.object({
                        name: z.string().describe('Category name, e.g. "Technology & Innovation"'),
                        emoji: z.string().describe('A single emoji representing this category'),
                        description: z.string().describe('One-sentence description of what topics fall under this category'),
                    })).describe('6-8 broad public speaking topic categories'),
                }),
                prompt: `You are a public speaking coach. Generate 6-8 diverse, broad categories for public speaking practice topics. 
                Categories should span different domains like technology, social issues, business, personal development, science, culture, etc.
                Make them interesting and varied to appeal to different speakers.`,
            });
            return Response.json(object);

        } else if (mode === 'topics' && category) {
            const { object } = await generateObject({
                model: vertex('gemini-2.5-flash'),
                schema: z.object({
                    topics: z.array(z.object({
                        title: z.string().describe('A specific, engaging topic title for a speech'),
                        prompt: z.string().describe('A 1-2 sentence description of what the speaker should address'),
                        difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('Difficulty level'),
                    })).describe('5 specific speaking topics under the given category'),
                }),
                prompt: `You are a public speaking coach. Generate 5 specific, engaging speech topics under the category: "${category}".
                Each topic should be specific enough to give the speaker clear direction but open enough for personal interpretation.
                Include a mix of difficulty levels. Make the topics thought-provoking and relevant.`,
            });
            return Response.json(object);

        } else if (mode === 'random') {
            const { object } = await generateObject({
                model: vertex('gemini-2.5-flash'),
                schema: z.object({
                    topic: z.object({
                        title: z.string().describe('A specific, engaging topic title for a speech'),
                        prompt: z.string().describe('A 1-2 sentence description of what the speaker should address'),
                        category: z.string().describe('The broad category this topic falls under'),
                        emoji: z.string().describe('A single emoji representing this topic'),
                    }),
                }),
                prompt: `You are a public speaking coach. Generate ONE random, interesting speech topic from any category.
                Make it thought-provoking, relevant, and suitable for a 2-5 minute impromptu speech practice.
                Be creative and varied — pick from technology, philosophy, social issues, personal growth, business, science, culture, or any other domain.`,
            });
            return Response.json(object);

        } else {
            return Response.json({ error: 'Invalid mode. Use "categories", "topics", or "random".' }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Topic generation error:", error);
        return Response.json(
            { error: `Failed to generate topics: ${error.message || "Unknown error"}` },
            { status: 500 }
        );
    }
}

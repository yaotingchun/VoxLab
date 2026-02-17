import { vertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';

export async function POST(req: Request) {
    try {
        const { postTitle, postContent } = await req.json();

        const { text } = await generateText({
            model: vertex('gemini-2.5-flash'),
            system: "You are the VoxLab AI Coach, an expert in public speaking, communication, and body language. Provide helpful, encouraging, and actionable advice to the user's forum post. Keep it concise (under 150 words) and friendly.",
            prompt: `Title: ${postTitle}\n\nContent: ${postContent}`,
        });

        return Response.json({ reply: text });
    } catch (error: any) {
        console.error('AI Reply Error:', error);
        return Response.json({
            error: 'Failed to generate reply',
            details: error.message
        }, { status: 500 });
    }
}

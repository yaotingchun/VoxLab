import { vertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';

export async function POST(req: Request) {
    try {
        const { comments } = await req.json();

        const { text } = await generateText({
            model: vertex('gemini-2.5-flash'),
            system: "You are the VoxLab AI Coach. Summarize the key points, advice, and consensus from the following discussion thread. Organize the summary with bullet points. Keep it professional and helpful.",
            prompt: `Discussion Comments:\n${comments.map((c: any) => `- ${c.authorName}: ${c.content}`).join('\n')}`,
        });

        return Response.json({ summary: text });
    } catch (error: any) {
        console.error('AI Summary Error:', error);
        return Response.json({
            error: 'Failed to generate summary',
            details: error.message
        }, { status: 500 });
    }
}

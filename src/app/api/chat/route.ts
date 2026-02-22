import { vertex } from '@ai-sdk/google-vertex';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        console.log("Received chat request");
        const { messages } = await req.json();



        // Manual conversion to CoreMessage[]
        const coreMessages = messages.map((m: any) => {
            if (m.role === 'user') {
                return { role: 'user', content: m.content };
            }
            if (m.role === 'assistant') {
                const content = m.content || (m.parts && m.parts.map((p: any) => p.text).join('')) || '';
                return { role: 'assistant', content };
            }
            return m;
        });

        const result = streamText({
            model: vertex('gemini-2.5-flash'),
            system: `You are a world-class Public Speaking Coach AI. Your goal is to help users improve their public speaking skills, including voice modulation, pacing, content structure, and confidence.

    When a user provides a speech script:
    1.  Analyze the content for clarity, impact, and flow.
    2.  Suggest improvements for opening hooks, strong closes, and key transitions.
    3.  Highlight areas where they might want to pause, emphasize, or change their tone.
    4.  **Script Analysis**: Identify sentences that are too long (breathlessness risk), suggest stronger transition words, and highlight complex jargon. Offer persuasive or casual rewrites.
    5.  **Vocal Warm-ups**: If requested, generate custom tongue twisters or pronunciation exercises targeting specific difficult vocabulary found in the script.

    When a user asks general questions:
    1.  Provide actionable, encouraging advice.
    2.  Use examples where possible.

    Maintain a supportive, professional, and inspiring persona. Keep your entire response under 150 words. Be extremely concise and punchy. Use bullet points where possible to keep it scannable.`,
            messages: coreMessages,
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("Error in chat route:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

import { vertex } from '@ai-sdk/google-vertex';
import { streamText, UIMessage } from 'ai';

export const maxDuration = 60; // Set max duration for edge function if needed

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Older versions of useChat don't support appending custom data payloads easily.
        // We embedded the report data inside the user's text message wrapped in <REPORT_DATA_JSON> tags.
        let reportData = null;

        // Manual conversion to CoreMessage[] and extraction of our hidden payload
        const coreMessages = messages.map((m: any) => {
            if (m.role === 'user') {
                let content = m.content || (m.parts ? m.parts.map((p: any) => p.text).join('') : "");

                // Extract the hidden payload if present
                const payloadMatch = content.match(/<REPORT_DATA_JSON>([\s\S]*?)<\/REPORT_DATA_JSON>/);
                if (payloadMatch && payloadMatch[1]) {
                    try {
                        reportData = JSON.parse(payloadMatch[1]);
                    } catch (e) {
                        console.error("Failed to parse embedded report data", e);
                    }
                    // Remove the massive data block from the actual message history
                    content = content.replace(/<REPORT_DATA_JSON>[\s\S]*?<\/REPORT_DATA_JSON>/, "").trim();
                }

                return { role: 'user', content };
            }
            if (m.role === 'assistant') {
                const content = m.content || (m.parts && m.parts.map((p: any) => p.text).join('')) || '';
                return { role: 'assistant', content };
            }
            return m;
        });

        const systemPrompt = `
You are a friendly, highly empathetic, and human-like public speaking coach named Vox. 
Your student has just finished a practice session. Here is their complete performance report data in JSON format:

${JSON.stringify(reportData || {}, null, 2)}

Your job is to answer the student's questions about THEIR specific performance based explicitly on the metrics, AI summaries, and transcript provided above. 

CRITICAL MENTOR PERSONA RULES:
1. Be extremely natural, conversational, and warm. Speak to the user like a supportive human mentor chatting over coffee, not an AI spitting out a dense technical manual.
2. Avoid robotic phrasing like "As an AI model...", "Here is an analysis...", or bullet-point overload unless specifically requested. Use transition words like "Honestly," "I noticed that," "You did a fantastic job with..."
3. Keep your answers concise and punchy. Short, encouraging paragraphs feel more human.
4. Do not hallucinate data. If they ask about something not in the report (like eye contact when not tracked), warmly tell them that metric wasn't captured this round.
5. Use the provided context to give highly specific praise and gentle, manageable tips based on their actual weaknesses or strengths.
`;

        const result = await streamText({
            model: vertex('gemini-2.5-flash'),
            system: systemPrompt,
            messages: coreMessages,
        });

        return result.toUIMessageStreamResponse();
    } catch (error: any) {
        console.error("Session Chat Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { ttsClient, INTERVIEW_VOICE_CONFIG, INTERVIEW_AUDIO_CONFIG } from '@/lib/tts';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Limit text length to prevent abuse
        if (text.length > 5000) {
            return NextResponse.json({ error: 'Text too long (max 5000 characters)' }, { status: 400 });
        }

        // Request speech synthesis
        const [response] = await ttsClient.synthesizeSpeech({
            input: { text },
            voice: INTERVIEW_VOICE_CONFIG,
            audioConfig: INTERVIEW_AUDIO_CONFIG,
        });

        if (!response.audioContent) {
            return NextResponse.json({ error: 'No audio generated' }, { status: 500 });
        }

        // Return MP3 audio
        return new NextResponse(response.audioContent as any, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': (response.audioContent as any).length.toString(),
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
        });
    } catch (error: any) {
        console.error('TTS Error:', error);
        return NextResponse.json(
            { error: `Text-to-speech failed: ${error.message}` },
            { status: 500 }
        );
    }
}
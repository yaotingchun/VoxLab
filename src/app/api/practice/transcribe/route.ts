import { NextRequest, NextResponse } from "next/server";
import speech from "@google-cloud/speech";

const client = new speech.SpeechClient({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    projectId: process.env.GOOGLE_PROJECT_ID,
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const isWav = file.type.includes('wav') || file.name.endsWith('.wav');

        console.log(`[Transcription API] Received ${file.name} (${file.type}), Size: ${buffer.length}, isWav: ${isWav}`);

        const config: any = {
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            useEnhanced: true,
            enableWordTimeOffsets: true,
        };

        if (!isWav) {
            config.encoding = 'WEBM_OPUS';
            config.sampleRateHertz = 48000;
            config.audioChannelCount = 1;
        }

        const request = {
            audio: {
                content: buffer.toString('base64'),
            },
            config,
        };

        const [response] = await client.recognize(request);
        const transcript = response.results
            ?.map(result => result.alternatives?.[0].transcript)
            .join(' ') || '';

        // Extract words for pause calculation
        const words: any[] = [];
        response.results?.forEach(result => {
            result.alternatives?.[0].words?.forEach(wordInfo => {
                words.push({
                    word: wordInfo.word,
                    startTime: Number(wordInfo.startTime?.seconds || 0) + Number(wordInfo.startTime?.nanos || 0) / 1e9,
                    endTime: Number(wordInfo.endTime?.seconds || 0) + Number(wordInfo.endTime?.nanos || 0) / 1e9,
                });
            });
        });

        console.log(`[Transcription API] Success: ${transcript.length > 0 ? 'Found words' : 'No words detected'}`);

        return NextResponse.json({
            success: true,
            transcript: transcript.trim(),
            words
        });

    } catch (error: any) {
        console.error("Transcription error:", error);
        return NextResponse.json({ error: error.message || "Failed to transcribe audio" }, { status: 500 });
    }
}

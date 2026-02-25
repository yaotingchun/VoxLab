import { NextRequest, NextResponse } from "next/server";
import { extractAudioFromVideo } from "@/lib/audioExtract";
import { analyzeAudio } from "@/lib/audioAnalysis";

export const maxDuration = 120; // 2 minutes max duration for Next.js

export async function POST(req: NextRequest) {
    console.log("Starting analyze-video POST request...");
    try {
        const formData = await req.formData();
        const videoFile = formData.get("video") as File | null;

        if (!videoFile) {
            console.error("No video file in formData");
            return NextResponse.json({ error: "No video file provided" }, { status: 400 });
        }

        console.log(`Received video file: ${videoFile.name}, size: ${videoFile.size} bytes`);

        // Convert File to Buffer
        const arrayBuffer = await videoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Extract Audio from Video (WAV, Mono, 16kHz)
        let wavBuffer: Buffer;
        try {
            console.log("Extracting audio with FFmpeg...");
            wavBuffer = await extractAudioFromVideo(buffer);
            console.log(`Extraction complete. Wav size: ${wavBuffer.length}`);
        } catch (error: any) {
            console.error("Audio Extraction Failed:", error);
            // Return a clean 500 error instead of silently hanging the request
            return NextResponse.json({ error: "Failed to extract audio from video: " + error.message }, { status: 500 });
        }

        // 2. Analyze Audio (Pitch, WPM, Pauses)
        try {
            console.log("Analyzing audio...");
            const analysisResult = await analyzeAudio(wavBuffer);
            console.log("Audio Analysis Complete:", analysisResult);
            return NextResponse.json(analysisResult);
        } catch (error: any) {
            console.error("Audio Analysis Failed:", error);
            return NextResponse.json({ error: "Failed to analyze audio: " + error.message }, { status: 500 });
        }
    } catch (error: any) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error: " + (error?.message || "Unknown") }, { status: 500 });
    }
}

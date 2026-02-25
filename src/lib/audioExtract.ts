import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const execAsync = promisify(exec);

/**
 * Extracts audio from a video buffer using native FFmpeg via child_process
 * Requirements: WAV, Mono, 16kHz, PCM 16-bit
 */
export async function extractAudioFromVideo(videoBuffer: Buffer): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const sessionId = Math.random().toString(36).substring(7);
    const inputPath = path.join(tmpDir, `input_${sessionId}.mp4`);
    const outputPath = path.join(tmpDir, `output_${sessionId}.wav`);

    const ffmpegPath = ffmpegInstaller.path || "ffmpeg";

    try {
        // Write the incoming buffer to a temporary file
        await fs.writeFile(inputPath, videoBuffer);

        console.log(`Executing native FFmpeg for ${inputPath} -> ${outputPath}`);

        // Execute native FFmpeg
        // -y: overwrite
        // -vn: ignore video
        // -acodec pcm_s16le: 16-bit PCM
        // -ac 1: Mono
        // -ar 16000: 16kHz
        await execAsync(`"${ffmpegPath}" -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}"`);

        // Read the result
        const wavData = await fs.readFile(outputPath);
        return wavData;

    } catch (error: any) {
        console.error("Native FFmpeg execution failed:", error.message || error);
        throw new Error(`FFmpeg processing failed: ${error.message || 'Unknown error'}`);
    } finally {
        // Cleanup temp files
        try { await fs.unlink(inputPath); } catch (e) { }
        try { await fs.unlink(outputPath); } catch (e) { }
    }
}

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export async function extractAudioFromVideo(file: File): Promise<Blob> {
    try {
        const ffmpeg = new FFmpeg();
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        const inputName = 'input.' + (file.name.split('.').pop() || 'mp4');
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', 'output.wav']);

        const fileData = await ffmpeg.readFile('output.wav');
        const data = fileData as Uint8Array;

        return new Blob([data as any], { type: 'audio/wav' });
    } catch (error) {
        console.warn('FFmpeg extraction failed, falling back to WebAudio API:', error);
        return fallbackExtractAudioFromVideo(file);
    }
}

async function fallbackExtractAudioFromVideo(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const reader = new FileReader();

        reader.onload = async (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
                return reject(new Error("Failed to read file"));
            }

            try {
                // Decode the audio data from the video file buffer
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                // Force 16kHz mono audio for Google Cloud Speech
                const targetSampleRate = 16000;
                const targetChannels = 1;

                // Create an offline context with specific target parameters
                const offlineContext = new OfflineAudioContext(
                    targetChannels,
                    Math.ceil(audioBuffer.duration * targetSampleRate),
                    targetSampleRate
                );

                // Create a buffer source and connect it to the offline destination
                const source = offlineContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(offlineContext.destination);
                source.start(0);

                // Render the audio and get the rendered buffer
                const renderedBuffer = await offlineContext.startRendering();

                // Convert AudioBuffer to WAV format
                const wavBuffer = audioBufferToWav(renderedBuffer);

                // Create a blob from the WAV data
                const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
                resolve(audioBlob);

            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Utility to convert AudioBuffer to WAV format (requires a simple implementation)
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result: Float32Array;
    if (numChannels === 2) {
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);
        result = new Float32Array(left.length * 2);
        for (let i = 0; i < left.length; i++) {
            result[i * 2] = left[i];
            result[i * 2 + 1] = right[i];
        }
    } else {
        result = buffer.getChannelData(0);
    }

    return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function encodeWAV(samples: Float32Array, format: number, sampleRate: number, numChannels: number, bitDepth: number) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, format, true); // AudioFormat
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitDepth, true); // BitsPerSample

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * bytesPerSample, true);

    // Write audio data
    floatTo16BitPCM(view, 44, samples);

    return buffer;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

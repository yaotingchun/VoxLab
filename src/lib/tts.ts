import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import path from 'path';

// Initialize the Text-to-Speech client
const keyFilePath = path.join(process.cwd(), 'credentials', 'google.json');

export const ttsClient = new TextToSpeechClient({
    keyFilename: keyFilePath,
});

// Professional voice configuration for interview scenarios
export const INTERVIEW_VOICE_CONFIG = {
    languageCode: 'en-US',
    // Using Wavenet for most natural-sounding voice
    name: 'en-US-Neural2-J', // Male voice, professional tone
    ssmlGender: 'MALE' as const,
};

export const INTERVIEW_AUDIO_CONFIG = {
    audioEncoding: 'MP3' as const,
    speakingRate: 0.95, // Slightly slower for clarity
    pitch: 0, // Natural pitch
    volumeGainDb: 0,
};
"use client";

// ── TTS Utility (Google Cloud Text-to-Speech) ────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;

/**
 * Speaks text using the Google Cloud TTS API, falling back to browser TTS if needed.
 */
export async function speakText(text: string): Promise<void> {
    // Stop any ongoing speech
    stopSpeaking();

    try {
        // Call our TTS API
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            console.error('TTS API failed, falling back to browser TTS');
            return fallbackBrowserTTS(text);
        }

        // Get audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play audio
        return new Promise((resolve) => {
            currentAudio = new Audio(audioUrl);
            currentAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                resolve();
            };
            currentAudio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                console.error('Audio playback failed, falling back to browser TTS');
                fallbackBrowserTTS(text).then(resolve);
            };
            currentAudio.play().catch((err) => {
                console.error('Audio play failed:', err);
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                fallbackBrowserTTS(text).then(resolve);
            });
        });
    } catch (error) {
        console.error('TTS error:', error);
        return fallbackBrowserTTS(text);
    }
}

/**
 * Stops any current speech immediately.
 */
export function stopSpeaking() {
    // Stop Google Cloud TTS audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    // Stop browser TTS (fallback)
    if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

// Fallback to browser's built-in TTS if Google Cloud TTS fails
function fallbackBrowserTTS(text: string): Promise<void> {
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            resolve();
            return;
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
            (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
        );
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
    });
}
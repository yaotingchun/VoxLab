"use client";

// ── TTS Utility (Google Cloud Text-to-Speech) ────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;
let currentAbortController: AbortController | null = null;
let lastRequestId = 0;
let pendingResolve: (() => void) | null = null;

/**
 * Speaks text using the Google Cloud TTS API, falling back to browser TTS if needed.
 */
export async function speakText(text: string): Promise<void> {
    // Stop any ongoing speech and cancel pending requests
    stopSpeaking();

    const requestId = ++lastRequestId;
    const abortController = new AbortController();
    currentAbortController = abortController;

    try {
        // Call our TTS API
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: abortController.signal
        });

        if (!response.ok) {
            console.error('TTS API failed, falling back to browser TTS');
            if (requestId === lastRequestId) {
                return fallbackBrowserTTS(text);
            }
            return;
        }

        // Get audio blob
        const audioBlob = await response.blob();

        // Check if a newer request has started
        if (requestId !== lastRequestId) {
            return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);

        // Play audio
        return new Promise((resolve) => {
            pendingResolve = resolve;
            currentAudio = new Audio(audioUrl);
            currentAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                pendingResolve = null;
                resolve();
            };
            currentAudio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                pendingResolve = null;
                console.error('Audio playback failed, falling back to browser TTS');
                if (requestId === lastRequestId) {
                    fallbackBrowserTTS(text).then(resolve);
                } else {
                    resolve();
                }
            };
            currentAudio.play().catch((err) => {
                console.error('Audio play failed:', err);
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                pendingResolve = null;
                if (requestId === lastRequestId) {
                    fallbackBrowserTTS(text).then(resolve);
                } else {
                    resolve();
                }
            });
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            return;
        }
        console.error('TTS error:', error);
        if (requestId === lastRequestId) {
            return fallbackBrowserTTS(text);
        }
    }
}

/**
 * Stops any current speech immediately.
 */
export function stopSpeaking() {
    // Cancel pending fetch
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }

    // Resolve any pending promise so the UI can reset
    if (pendingResolve) {
        pendingResolve();
        pendingResolve = null;
    }

    // Increment request ID to invalidate any lingering callbacks
    lastRequestId++;

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
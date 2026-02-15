"use server";

import { v2 } from "@google-cloud/speech";

const speechClient = new v2.SpeechClient({
    apiEndpoint: "us-central1-speech.googleapis.com",
});

export async function transcribeAudio(audioBase64: string) {
    try {
        // The audio is sent as a base64 string from the client
        // We need to strip the data URL prefix. Using split is more robust than regex for complex mime types.
        const content = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;

        const projectId = await speechClient.getProjectId();
        const location = "us-central1";
        const recognizer = `projects/${projectId}/locations/${location}/recognizers/_`;

        const request = {
            recognizer,
            config: {
                autoDecodingConfig: {}, // Automatically detect encoding
                model: "chirp_2",
                languageCodes: ["en-US"],
            },
            content,
        };

        const [response] = await speechClient.recognize(request);

        // In v2, results are in response.results
        const transcription = response.results
            ?.map((result) => result.alternatives?.[0].transcript)
            .join("\n");

        if (!transcription) {
            return { success: false, error: "No transcription returned" };
        }

        return { success: true, transcription };
    } catch (error) {
        console.error("Transcription error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
    }
}

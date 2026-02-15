import { WebSocketServer, WebSocket } from "ws";
import { v2 } from "@google-cloud/speech";
import type { google } from "@google-cloud/speech/build/protos/protos";

import path from "path";
import fs from "fs";

const PORT = Number(process.env.WS_PORT) || 3002;
const CREDENTIALS_PATH = path.resolve("credentials/google.json");

// Read project ID directly from credentials file
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
const PROJECT_ID = credentials.project_id;
console.log(`📋 Using project: ${PROJECT_ID}`);

const speechClient = new v2.SpeechClient({
    apiEndpoint: "us-central1-speech.googleapis.com",
    keyFilename: CREDENTIALS_PATH,
});

const wss = new WebSocketServer({ port: PORT });

console.log(`🎙️  WebSocket server listening on ws://localhost:${PORT}`);

wss.on("connection", (ws: WebSocket) => {
    console.log("🔗 Client connected");

    let recognizeStream: ReturnType<typeof speechClient.streamingRecognize> | null = null;
    let isStreamActive = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;

    async function startStream() {
        try {
            const location = "us-central1";
            const recognizer = `projects/${PROJECT_ID}/locations/${location}/recognizers/_`;

            const streamingConfig: google.cloud.speech.v2.IStreamingRecognitionConfig = {
                config: {
                    explicitDecodingConfig: {
                        encoding: "LINEAR16",
                        sampleRateHertz: 16000,
                        audioChannelCount: 1,
                    },
                    model: "chirp_2",
                    languageCodes: ["en-US"],
                    features: {
                        enableAutomaticPunctuation: true,
                    },
                },
                streamingFeatures: {
                    interimResults: true,
                },
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognizeStream = (speechClient as any)._streamingRecognize();
            isStreamActive = true;

            // Send the initial config message (must be first write)
            recognizeStream!.write({
                recognizer,
                streamingConfig,
            });

            recognizeStream!.on("data", (response: google.cloud.speech.v2.IStreamingRecognizeResponse) => {
                // Reset retry counter on successful data
                retryCount = 0;
                if (response.results && response.results.length > 0) {
                    for (const result of response.results) {
                        const transcript = result.alternatives?.[0]?.transcript || "";
                        const isFinal = result.isFinal || false;

                        // Extract audio timestamp from resultEndOffset
                        const endOffset = result.resultEndOffset;
                        let audioTimestampMs = 0;
                        if (endOffset) {
                            const seconds = Number(endOffset.seconds || 0);
                            const nanos = Number(endOffset.nanos || 0);
                            audioTimestampMs = seconds * 1000 + Math.floor(nanos / 1_000_000);
                        }

                        if (transcript) {
                            const message = JSON.stringify({ transcript, isFinal, audioTimestampMs });
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(message);
                            }
                        }
                    }
                }
            });

            recognizeStream!.on("error", (error: Error) => {
                const grpcError = error as Error & { code?: number };

                // Auto-retry on transient errors (INTERNAL=13, OUT_OF_RANGE=11)
                if ((grpcError.code === 13 || grpcError.code === 11) && retryCount < MAX_RETRIES) {
                    retryCount++;
                    const reason = grpcError.code === 11 ? "stream time limit" : "transient error";
                    console.log(`🔄 Auto-retry ${retryCount}/${MAX_RETRIES} (${reason})...`);
                    setTimeout(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            restartStream();
                        }
                    }, RETRY_DELAY_MS);
                } else if (grpcError.code === 13 || grpcError.code === 11) {
                    console.error(`❌ Max retries reached (${grpcError.code}):`, error.message);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ error: "Transcription stream failed after retries. Try stopping and starting again." }));
                    }
                } else {
                    console.error("❌ Stream error:", error.message);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ error: error.message }));
                    }
                }
            });

            recognizeStream!.on("end", () => {
                isStreamActive = false;
                recognizeStream = null;
                console.log("📭 Recognize stream ended");
                // Signal the client that all results have been flushed
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ done: true }));
                }
            });

            console.log(`🎤 Streaming recognition started${retryCount > 0 ? ` (retry ${retryCount})` : ""}`);
        } catch (err) {
            console.error("❌ Failed to start stream:", err);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ error: "Failed to start speech recognition stream" }));
            }
        }
    }

    function restartStream() {
        if (recognizeStream) {
            try {
                recognizeStream.end();
            } catch {
                // ignore end errors
            }
        }
        recognizeStream = null;
        isStreamActive = false;
        startStream();
    }

    function stopStream() {
        if (recognizeStream) {
            isStreamActive = false;
            try {
                // End the write side — Google will flush remaining results
                // then fire the 'end' event, which sends { done: true }
                recognizeStream.end();
            } catch {
                // If end fails, send done immediately
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ done: true }));
                }
            }
            console.log("⏹️  Stream stopped by client, waiting for final results...");
        } else {
            // No active stream, send done immediately
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ done: true }));
            }
        }
    }

    ws.on("message", (data: Buffer | string, isBinary: boolean) => {
        // Text messages are control signals
        if (!isBinary) {
            const message = data.toString();
            if (message === "start") {
                console.log("▶️  Received start command");
                startStream();
            } else if (message === "stop") {
                console.log("⏹️  Received stop command");
                stopStream();
            }
            return;
        }

        // Binary messages are audio chunks
        if (recognizeStream && isStreamActive) {
            const audioBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data as unknown as ArrayBuffer);
            try {
                recognizeStream.write({ audio: audioBuffer });
            } catch (err) {
                console.error("❌ Error writing audio chunk:", err);
            }
        }
    });

    ws.on("close", () => {
        console.log("🔌 Client disconnected");
        stopStream();
    });

    ws.on("error", (err: Error) => {
        console.error("❌ WebSocket error:", err.message);
        stopStream();
    });
});

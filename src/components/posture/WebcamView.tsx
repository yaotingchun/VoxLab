"use client";

import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from "@mediapipe/tasks-vision";

interface WebcamViewProps {
    onResults: (results: PoseLandmarkerResult) => void;
}

export function WebcamView({ onResults }: WebcamViewProps) {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);

    useEffect(() => {
        const loadPoseLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                poseLandmarkerRef.current = poseLandmarker;
                setIsModelLoaded(true);
                console.log("PoseLandmarker loaded successfully");
            } catch (error) {
                console.error("Error loading PoseLandmarker:", error);
            }
        };

        loadPoseLandmarker();

        return () => {
            if (poseLandmarkerRef.current) {
                poseLandmarkerRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        if (!isModelLoaded || !poseLandmarkerRef.current) return;

        let lastVideoTime = -1;

        const renderLoop = () => {
            if (
                webcamRef.current &&
                webcamRef.current.video &&
                webcamRef.current.video.readyState === 4
            ) {
                const video = webcamRef.current.video;
                const startTimeMs = performance.now();

                if (video.currentTime !== lastVideoTime) {
                    lastVideoTime = video.currentTime;
                    // Detect
                    const result = poseLandmarkerRef.current?.detectForVideo(video, startTimeMs);
                    if (result) {
                        onResults(result);
                    }
                }
            }
            requestRef.current = requestAnimationFrame(renderLoop);
        };

        renderLoop();

        return () => {
            cancelAnimationFrame(requestRef.current);
        };

    }, [isModelLoaded, onResults]);

    return (
        <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
            <Webcam
                ref={webcamRef}
                audio={false}
                width={640}
                height={480}
                screenshotFormat="image/jpeg"
                className="w-full h-auto transform scale-x-[-1]" // Mirror the video
            />
            {!isModelLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                    <p>Loading AI Model...</p>
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full transform scale-x-[-1]" // Mirror the canvas too
            />
        </div>
    );
}

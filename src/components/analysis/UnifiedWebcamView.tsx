"use client";

import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import {
    FilesetResolver,
    PoseLandmarker,
    PoseLandmarkerResult,
    FaceLandmarker,
    FaceLandmarkerResult
} from "@mediapipe/tasks-vision";

interface UnifiedWebcamViewProps {
    onPoseResults: (results: PoseLandmarkerResult) => void;
    onFaceResults: (results: FaceLandmarkerResult) => void;
}

export function UnifiedWebcamView({ onPoseResults, onFaceResults }: UnifiedWebcamViewProps) {
    const webcamRef = useRef<Webcam>(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const requestRef = useRef<number>(0);
    const [hasMounted, setHasMounted] = useState(false);

    // Global console suppression for TFLite logs
    useEffect(() => {
        const originalError = console.error;
        const originalLog = console.log;
        const originalInfo = console.info;

        const createFilter = (originalMethod: (...args: any[]) => void) => {
            return (...args: any[]) => {
                const msg = args.map(a => String(a)).join(' ');
                if (
                    msg.includes('TensorFlow Lite') ||
                    msg.includes('XNNPACK') ||
                    msg.includes('INFO:')
                ) {
                    return;
                }
                originalMethod.apply(console, args);
            };
        };

        console.error = createFilter(originalError);
        console.log = createFilter(originalLog);
        console.info = createFilter(originalInfo);

        return () => {
            console.error = originalError;
            console.log = originalLog;
            console.info = originalInfo;
        };
    }, []);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const loadModels = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                if (isCancelled) return;

                // Load Pose Landmarker
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

                if (isCancelled) {
                    poseLandmarker.close();
                    return;
                }

                // Load Face Landmarker
                const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 1,
                    minFaceDetectionConfidence: 0.5,
                    minFacePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                    outputFaceBlendshapes: true,
                });

                if (isCancelled) {
                    poseLandmarker.close();
                    faceLandmarker.close();
                    return;
                }

                poseLandmarkerRef.current = poseLandmarker;
                faceLandmarkerRef.current = faceLandmarker;
                setIsModelLoaded(true);
                console.log("Models loaded successfully");
            } catch (error) {
                console.error("Error loading models:", error);
            }
        };

        if (hasMounted) {
            loadModels();
        }

        return () => {
            isCancelled = true;
            poseLandmarkerRef.current?.close();
            faceLandmarkerRef.current?.close();
            poseLandmarkerRef.current = null;
            faceLandmarkerRef.current = null;
            setIsModelLoaded(false);
        };
    }, [hasMounted]);

    useEffect(() => {
        if (!isModelLoaded || !poseLandmarkerRef.current || !faceLandmarkerRef.current) return;

        let lastVideoTime = -1;

        const renderLoop = () => {
            if (
                webcamRef.current &&
                webcamRef.current.video &&
                webcamRef.current.video.readyState === 4 &&
                webcamRef.current.video.videoWidth > 0 &&
                webcamRef.current.video.videoHeight > 0
            ) {
                const video = webcamRef.current.video;
                const startTimeMs = performance.now();

                if (video.currentTime !== lastVideoTime) {
                    lastVideoTime = video.currentTime;

                    // Capture refs local variables
                    const poseLandmarker = poseLandmarkerRef.current;
                    const faceLandmarker = faceLandmarkerRef.current;

                    if (poseLandmarker && faceLandmarker) {
                        try {
                            const poseResult = poseLandmarker.detectForVideo(video, startTimeMs);
                            if (poseResult) onPoseResults(poseResult);

                            const faceResult = faceLandmarker.detectForVideo(video, startTimeMs);
                            if (faceResult) onFaceResults(faceResult);
                        } catch (e) {
                            // Silently fail for frame glitches
                        }
                    }
                }
            }
            requestRef.current = requestAnimationFrame(renderLoop);
        };

        renderLoop();

        return () => {
            cancelAnimationFrame(requestRef.current);
        };

    }, [isModelLoaded, onPoseResults, onFaceResults]);

    if (!hasMounted) return <div className="bg-black w-full h-full" />;

    return (
        <div className="relative w-full h-full">
            {/* Main Webcam Feed */}
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full"
                style={{ objectFit: "contain", transform: "scaleX(-1)" }}
                videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: "user"
                }}
            />

            {!isModelLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-50">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-medium animate-pulse">Initializing AI Models...</p>
                    <p className="text-xs text-gray-400 mt-2">Loading Face & Posture Detection</p>
                </div>
            )}
        </div>
    );
}

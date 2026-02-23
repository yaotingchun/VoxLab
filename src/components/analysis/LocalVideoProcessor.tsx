"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    FilesetResolver,
    FaceLandmarker,
    PoseLandmarker,
} from '@mediapipe/tasks-vision';
import { useFaceAnalysis } from '@/hooks/useFaceAnalysis';
import { usePostureAnalysis } from '@/hooks/usePostureAnalysis';
import { useAuth } from '@/contexts/AuthContext';
import { saveSession } from '@/lib/sessions';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileVideo, Play, CheckCircle, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { RubricUploader, RubricData } from './RubricUploader';
import { extractAudioFromVideo } from '@/lib/audioExtract';
import { analyzePauses, calculatePauseStats, getPauseFeedback, Word } from '@/lib/pause-analysis';
import { analyzeSession } from '@/app/actions/analyzeSession';
import { analyzeVocal } from '@/app/actions/analyzeVocal';
import { analyzePosture as getAIPostureAnalysis } from '@/app/actions/analyzePosture';

type ProcessingStatus = 'idle' | 'uploading' | 'loading_models' | 'analyzing' | 'transcribing' | 'generating_report' | 'complete' | 'error';

export function LocalVideoProcessor({ onComplete }: { onComplete?: (sessionId: string) => void }) {
    const { user } = useAuth();
    const [status, setStatus] = useState<ProcessingStatus>('idle');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoSrc, setVideoSrc] = useState<string>('');
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [rubricData, setRubricData] = useState<RubricData | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const requestRef = useRef<number>(0);

    // MediaPipe models
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);

    // AI Analysis hooks
    const { analyzeFace, startSession: startFace, endSession: endFace } = useFaceAnalysis();
    const { analyze: analyzePosture, startSession: startPosture, endSession: endPosture, result: postureResult } = usePostureAnalysis();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setVideoFile(file);
            setVideoSrc(URL.createObjectURL(file));
            setStatus('idle');
            setProgress(0);
            setErrorMessage('');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/mp4': ['.mp4'],
            'video/webm': ['.webm'],
        },
        maxFiles: 1,
    });

    const loadModels = async () => {
        try {
            setStatus('loading_models');
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            if (!poseLandmarkerRef.current) {
                poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
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
            }

            if (!faceLandmarkerRef.current) {
                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 5, // Task 2: Multi-person detection
                    minFaceDetectionConfidence: 0.5,
                    minFacePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                    outputFaceBlendshapes: true,
                });
            }
        } catch (error) {
            console.error("Error loading models:", error);
            setStatus('error');
            setErrorMessage('Failed to load AI models. Please check your connection.');
            throw error;
        }
    };

    const startAnalysis = async () => {
        if (!videoRef.current || !videoFile || !user) return;

        try {
            await loadModels();

            setStatus('analyzing');
            startFace();
            startPosture();

            const video = videoRef.current;
            video.currentTime = 0;

            // Wait for video metadata to be loaded so duration is available
            if (video.readyState < 1) {
                await new Promise((resolve) => {
                    video.onloadedmetadata = resolve;
                });
            }

            video.play();

            let lastVideoTime = -1;

            const renderLoop = () => {
                if (video.paused || video.ended) {
                    return; // Stop loop if video ended
                }

                if (video.currentTime !== lastVideoTime) {
                    lastVideoTime = video.currentTime;
                    const startTimeMs = performance.now();

                    // Calculate progress
                    if (video.duration) {
                        setProgress(Math.round((video.currentTime / video.duration) * 100));
                    }

                    const poseLandmarker = poseLandmarkerRef.current;
                    const faceLandmarker = faceLandmarkerRef.current;

                    if (poseLandmarker && faceLandmarker) {
                        try {
                            const poseResult = poseLandmarker.detectForVideo(video, startTimeMs);
                            if (poseResult) analyzePosture(poseResult, video.currentTime * 1000);

                            const faceResult = faceLandmarker.detectForVideo(video, startTimeMs);
                            if (faceResult) analyzeFace(faceResult);
                        } catch (e) {
                            // Silently fail frame drops
                        }
                    }
                }
                requestRef.current = requestAnimationFrame(renderLoop);
            };

            renderLoop();

        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    const handleVideoEnded = async () => {
        cancelAnimationFrame(requestRef.current);

        const faceData = endFace();
        const postureData = endPosture();

        if (!user) return;

        try {
            setStatus('transcribing');
            let transcriptText = "";
            let transcriptionWords: Word[] = [];
            let transcriptionError = "";

            try {
                let fileToSend: Blob = videoFile!;
                let filename = videoFile!.name || 'video.mp4';
                let usedFallback = true;

                try {
                    // Start audio extraction client-side to save bandwidth
                    fileToSend = await extractAudioFromVideo(videoFile!);
                    filename = 'audio.wav';
                    usedFallback = false;
                    console.log(`[Transcription] Successfully extracted ${fileToSend.size} bytes of audio/wav client-side.`);
                } catch (extractErr: any) {
                    console.warn(`[Transcription] Audio extraction failed (${extractErr.message}). Falling back to raw video send:`, videoFile!.size, "bytes", videoFile!.type);
                }

                // Transcribe
                console.log(`[Transcription] Sending payload: ${filename} (${fileToSend.size} bytes, type: ${fileToSend.type || 'unknown'}, fallback: ${usedFallback})`);
                const formData = new FormData();
                formData.append('file', fileToSend, filename);

                const response = await fetch('/api/practice/transcribe', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        transcriptText = data.transcript;
                        if (data.words) {
                            transcriptionWords = data.words;
                        }
                    } else {
                        transcriptionError = data.error || "Transcription returned false success";
                        console.error("Transcription API logic error:", data);
                    }
                } else {
                    const errorText = await response.text();
                    transcriptionError = `HTTP ${response.status}: ${errorText}`;
                    console.error("Transcription API HTTP Error:", response.status, errorText);
                }
            } catch (audioErr: any) {
                console.error("Failed to fetch transcribe endpoint or extract audio:", audioErr);
                transcriptionError = audioErr.message || "Unknown client error during transcription";
            }

            setStatus('generating_report');
            let complianceReport = null;

            if (transcriptText) {
                try {
                    const reportRes = await fetch('/api/practice/compliance-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            transcript: transcriptText,
                            rubric: rubricData,
                            faceMetrics: {
                                averageEngagement: faceData.faceMetrics.averageEngagement,
                                smilePercentage: faceData.faceMetrics.smilePercentage,
                                blinkRateAverage: faceData.faceMetrics.blinkRateAverage,
                                eyeContactScore: faceData.faceMetrics.eyeContactScore,
                            },
                            postureMetrics: {
                                postureScore: Math.round(postureData.averageScore)
                            }
                        })
                    });

                    if (reportRes.ok) {
                        const reportData = await reportRes.json();
                        if (reportData.success) {
                            complianceReport = reportData.report;
                        }
                    }
                } catch (reportErr) {
                    console.warn("Failed to generate compliance report", reportErr);
                }
            }

            // --- Generate Manual Speech Metrics from Transcript ---
            // Basic word count
            let wordsArray = transcriptText.trim().split(/\s+/).filter(w => w.length > 0);
            const totalWords = transcriptionWords.length > 0 ? transcriptionWords.length : wordsArray.length;

            // WPM based on total duration of the video
            const wpm = faceData.duration > 0 ? Math.round((totalWords / faceData.duration) * 60) : 0;

            // Count common filler words
            const fillerDetectors = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically'];
            const fillerCounts: Record<string, number> = {};
            let totalFillers = 0;
            const transcriptLower = transcriptText.toLowerCase();

            fillerDetectors.forEach(filler => {
                const regex = new RegExp(`\\b${filler}\\b`, 'gi');
                const matches = transcriptLower.match(regex);
                if (matches) {
                    fillerCounts[filler] = matches.length;
                    totalFillers += matches.length;
                }
            });

            const mockAudioMetrics = {
                averageVolume: -15,   // dbFS
                averagePitch: 120,    // Hz
                pitchRange: 8,        // semitones
                isMonotone: false,
                isTooQuiet: false,
                pitchStdDev: 3
            };

            let realPauseStats;
            let realPauseFeedback;
            let realPauseCount = 0;

            if (transcriptionWords.length > 0) {
                const currentPauses = analyzePauses(transcriptionWords);
                realPauseStats = calculatePauseStats(currentPauses, faceData.duration);
                realPauseFeedback = getPauseFeedback(realPauseStats);
                realPauseCount = realPauseStats.totalPauses;
            } else {
                realPauseStats = {
                    totalPauses: 0,
                    totalPauseDuration: 0,
                    pauseRatio: 0.1,
                    thinkingCount: 0,
                    emphasisCount: 0,
                    naturalCount: 0,
                    breakdownCount: 0
                };
                realPauseFeedback = { message: "Pause tracking relies on valid speech detection. Defaults used.", type: "warn" as const };
            }

            // Call AI Summaries (With Fallbacks if Vertex fails or transcript is empty)
            let aiSummary: any = { error: true };
            let vocalSummary: any = { error: true };
            let aiPostureSummary: any = { error: true };

            try {
                const results = await Promise.allSettled([
                    analyzeSession({
                        duration: faceData.duration,
                        averageScore: Math.round(((faceData.faceMetrics.averageEngagement || 0) + (postureData.averageScore || 0)) / 2) || 50,
                        issueCounts: postureData.issueCounts,
                        faceMetrics: {
                            averageEngagement: faceData.faceMetrics.averageEngagement,
                            smilePercentage: faceData.faceMetrics.smilePercentage,
                            blinkRateAverage: faceData.faceMetrics.blinkRateAverage,
                            eyeContactScore: faceData.faceMetrics.eyeContactScore
                        },
                        speechMetrics: {
                            totalWords,
                            fillerCounts,
                            pauseCount: realPauseCount,
                            wpmHistory: wpm > 0 ? [wpm] : [],
                            pauseStats: realPauseStats
                        },
                        audioMetrics: mockAudioMetrics
                    }),
                    analyzeVocal({
                        speechMetrics: {
                            totalWords,
                            fillerCounts,
                            pauseCount: realPauseCount,
                            wpmHistory: wpm > 0 ? [wpm] : [],
                            pauseStats: realPauseStats
                        },
                        audioMetrics: mockAudioMetrics
                    }),
                    getAIPostureAnalysis({
                        issueCounts: postureData.issueCounts,
                        faceMetrics: faceData.faceMetrics
                    })
                ]);

                if (results[0].status === 'fulfilled') aiSummary = results[0].value;
                if (results[1].status === 'fulfilled') vocalSummary = results[1].value;
                if (results[2].status === 'fulfilled') aiPostureSummary = results[2].value;

            } catch (aiErr) {
                console.warn("AI Summaries failed", aiErr);
            }

            // Provide sensible fallback data if AI failed (e.g., due to no speech)
            if (aiSummary?.error) {
                aiSummary = {
                    summary: transcriptionError ? `Transcription failed: ${transcriptionError}` : transcriptText ? "Good effort! Try to speak a bit clearer next time." : "No speech detected in this video to analyze.",
                    tips: transcriptionError ? ["Try a shorter video", "Ensure standard MP4 format"] : transcriptText ? ["Practice pacing", "Reduce filler words", "Maintain eye contact"] : ["Ensure your microphone is recorded", "Speak louder", "Look at the camera"],
                    score: 50
                };
            }
            if (vocalSummary?.error) {
                vocalSummary = {
                    summary: transcriptionError ? `Vocal analysis unavailable. Error: ${transcriptionError}` : transcriptText ? "Your vocal delivery was mostly stable, but could use more dynamic range." : "Vocal analysis unavailable without clear audio.",
                    tips: transcriptionError ? ["Check video codec"] : transcriptText ? ["Vary your pitch to avoid sounding monotone", "Breathe from your diaphragm", "Emphasize key words"] : ["Speak clearly", "Check microphone"],
                    score: 50
                };
            }
            if (aiPostureSummary?.error) {
                aiPostureSummary = {
                    summary: "Your physical presence was acceptable, but prioritize maintaining consistent eye contact with the camera lens.",
                    tips: ["Sit up straight", "Keep your shoulders relaxed", "Look directly into the camera lens"],
                    score: Math.round(postureData.averageScore) || 50
                };
            }

            setStatus('uploading');
            // 1. Save results to Firestore
            // Calculate an overall score simply
            const overallScore = Math.round(((faceData.faceMetrics.averageEngagement || 0) + (postureData.averageScore || 0)) / 2) || 50;

            // Build topics array based on detected issues
            const topics: string[] = [];
            if (faceData.faceMetrics.hasHighBlinkRate) topics.push("High Blink Rate");
            if (faceData.faceMetrics.hasMouthTension) topics.push("Mouth Tension");
            if (faceData.faceMetrics.hasShiftyEyes) topics.push("Shifty Eyes");
            if (faceData.faceMetrics.hasPoorCameraClarity) topics.push("Poor Camera Clarity");

            // Posture issues are in postureData.issueCounts
            Object.entries(postureData.issueCounts).forEach(([issue, count]) => {
                if (count > 5) topics.push(issue); // simplistic threshold
            });

            let videoPublicUrl = "";
            try {
                // Get signed URL
                const signRes = await fetch('/api/upload/sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: videoFile!.name || 'practice-video.mp4',
                        contentType: videoFile!.type || 'video/mp4'
                    })
                });

                if (signRes.ok) {
                    const { uploadUrl, publicUrl } = await signRes.json();

                    // Upload file to GCS
                    const uploadRes = await fetch(uploadUrl, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': videoFile!.type || 'video/mp4'
                        },
                        body: videoFile!
                    });

                    if (uploadRes.ok) {
                        videoPublicUrl = publicUrl;
                    } else {
                        console.error('Failed to upload video to GCS');
                    }
                }
            } catch (err) {
                console.error('Error during video upload sequence:', err);
            }

            const finalAiSummaryText = aiSummary.summary || "Summary unavailable.";
            const finalAiTips = aiSummary.tips || [];

            const fullMockPauseStats = {
                stats: realPauseStats,
                feedback: realPauseFeedback
            };

            const sessionId = await saveSession(user.uid, {
                duration: Math.round(faceData.duration),
                score: aiSummary.score || overallScore,
                topics,
                wpm,
                totalWords,
                aiSummary: finalAiSummaryText,
                tips: finalAiTips,
                vocalSummary: vocalSummary,
                postureSummary: aiPostureSummary,
                fillerCounts,
                issueCounts: postureData.issueCounts, // explicitly save issueCounts at root for the detailed report
                pauseCount: realPauseCount,
                wpmHistory: wpm > 0 ? [wpm] : [],
                pauseStats: fullMockPauseStats,
                audioMetrics: mockAudioMetrics,
                transcript: transcriptText || (transcriptionError ? `[Transcription Error: ${transcriptionError}]` : "No speech recorded."),
                faceMetrics: {
                    averageEngagement: faceData.faceMetrics.averageEngagement,
                    smilePercentage: faceData.faceMetrics.smilePercentage,
                    blinkRateAverage: faceData.faceMetrics.blinkRateAverage,
                    eyeContactScore: faceData.faceMetrics.eyeContactScore,
                    hasPoorCameraClarity: faceData.faceMetrics.hasPoorCameraClarity
                },
                postureMetrics: {
                    postureScore: Math.round(postureData.averageScore),
                    issueCounts: postureData.issueCounts
                },
                rubric: rubricData,
                complianceReport: complianceReport,
                videoUrl: videoPublicUrl || null
            } as any); // Using 'as any' for now to avoid cascading interface updates until the full report is built

            // 3. Update Streak Data
            try {
                // We need to fetch the sessions we just modified to recalculate the history
                const { getRecentSessions } = await import('@/lib/sessions');
                const { syncStreakFromHistory } = await import('@/lib/streak');

                const recentSessions = await getRecentSessions(user.uid, 100);

                const validDates: string[] = [];
                for (const sess of recentSessions) {
                    let d: Date | null = null;
                    if (sess.createdAt) {
                        if (typeof (sess.createdAt as any).toDate === 'function') {
                            d = (sess.createdAt as any).toDate();
                        } else if (typeof sess.createdAt === 'string' || typeof sess.createdAt === 'number') {
                            d = new Date(sess.createdAt);
                        } else if (typeof (sess.createdAt as any).seconds === 'number') {
                            d = new Date((sess.createdAt as any).seconds * 1000);
                        }
                    }
                    if (d && !isNaN(d.getTime())) {
                        validDates.push(d.toISOString());
                    }
                }

                // Make sure to include "now" as a valid practice date since we just recorded a session!
                validDates.push(new Date().toISOString());

                if (validDates.length > 0) {
                    await syncStreakFromHistory(user.uid, validDates);
                }
            } catch (streakErr) {
                console.error("Failed to update streak after session", streakErr);
            }

            setStatus('complete');
            if (onComplete && sessionId) onComplete(sessionId);

        } catch (error) {
            console.error("Failed to save session:", error);
            setStatus('error');
            setErrorMessage('Failed to save analysis results.');
        }
    };

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
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            poseLandmarkerRef.current?.close();
            faceLandmarkerRef.current?.close();
            if (videoSrc) URL.revokeObjectURL(videoSrc);
        };
    }, [videoSrc]);

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-xl space-y-6">
            <h2 className="text-xl font-semibold text-white">Practice Mode</h2>

            {status === 'idle' && (
                <RubricUploader onRubricParsed={(data) => setRubricData(data)} />
            )}

            {!videoFile && (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                        ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'}
                    `}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 font-medium mb-1">
                        Drag & Drop or Click to Upload
                    </p>
                    <p className="text-sm text-gray-500">
                        Supports MP4, WebM up to 50MB
                    </p>
                </div>
            )}

            {videoFile && status === 'idle' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-lg">
                        <FileVideo className="w-8 h-8 text-blue-400" />
                        <div className="flex-1 truncate">
                            <p className="text-white font-medium truncate">{videoFile.name}</p>
                            <p className="text-sm text-gray-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <Button onClick={() => setVideoFile(null)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                            Remove
                        </Button>
                    </div>

                    <Button onClick={startAnalysis} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                        <Play className="w-5 h-5 mr-2" /> Start Analysis
                    </Button>
                </div>
            )}

            {status !== 'idle' && videoFile && (
                <div className="space-y-6">
                    {status === 'loading_models' && (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            <p className="text-white font-medium">Loading AI Models...</p>
                        </div>
                    )}

                    {status === 'analyzing' && (
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-blue-400 font-medium">Analyzing Frames</span>
                                <span className="text-gray-400">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-gray-800" />
                            <p className="text-xs text-gray-500 text-center">Please keep this tab open during analysis</p>
                        </div>
                    )}

                    {status === 'transcribing' && (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                            <p className="text-white font-medium">Transcribing Audio...</p>
                        </div>
                    )}

                    {status === 'generating_report' && (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                            <p className="text-white font-medium">Generating Report...</p>
                        </div>
                    )}

                    {status === 'uploading' && (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                            <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
                            <p className="text-white font-medium">Saving Results...</p>
                        </div>
                    )}

                    {status === 'complete' && (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-green-500/10 rounded-xl border border-green-500/20">
                            <CheckCircle className="w-16 h-16 text-green-500" />
                            <div>
                                <h3 className="text-xl font-semibold text-white">Analysis Complete!</h3>
                                <p className="text-gray-400 mt-1">Your practice session has been recorded.</p>
                            </div>
                            <Button onClick={() => setVideoFile(null)} variant="outline" className="mt-4">
                                Analyze Another Video
                            </Button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                            <p className="text-red-400 mb-4">{errorMessage}</p>
                            <Button onClick={() => setStatus('idle')} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Hidden video element for processing */}
            <video
                ref={videoRef}
                src={videoSrc || undefined}
                className="hidden"
                muted
                playsInline
                onEnded={handleVideoEnded}
            />
        </div>
    );
}

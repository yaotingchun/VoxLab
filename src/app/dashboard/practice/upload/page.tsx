"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UploadCloud, FileVideo, X, Loader2, PlayCircle } from "lucide-react";
import Link from "next/link";
import { DetailedSessionReport } from "@/components/analysis/DetailedSessionReport";
import { useRef, useEffect } from "react";
import { FilesetResolver, PoseLandmarker, FaceLandmarker } from "@mediapipe/tasks-vision";
import { usePostureAnalysis } from "@/hooks/usePostureAnalysis";
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis";

// Add Firebase & Action imports
import { saveSessionToGCS, getGCSUploadUrl } from "@/app/actions/saveSession";
import { saveSession, getSessionStats } from "@/lib/sessions";
import { useAuth } from "@/contexts/AuthContext";
import { getUserStreak, getLocalDateString } from "@/lib/streak";
import { checkAndAwardBadges } from "@/lib/badges";
import { analyzeSession } from "@/app/actions/analyzeSession";
import { analyzeVocal } from "@/app/actions/analyzeVocal";
import { analyzePosture as getAIPostureAnalysis } from "@/app/actions/analyzePosture";
import { parseRubric } from "@/app/actions/parseRubric";
import { FileText } from "lucide-react";

interface ExtendedAnalysisResult {
    wpm: number;
    avgPitch: number;
    pitchVariation: string;
    pauses: number;
    transcript: string;
    duration: number;
    totalWords: number;
    fillerCounts: Record<string, number>;
    wpmHistory: number[];
    words: { word: string; startTime: number; endTime: number }[];
    pauseStats: {
        stats: any;
        feedback: { message: string; type: "good" | "warn" | "bad" };
    };
    audioMetrics: {
        averageVolume: number;
        pitchRange: number;
        pitchStdDev: number;
        isMonotone: boolean;
        isTooQuiet: boolean;
        quietPercentage: number;
    };
    volumeSamples: number[];
    pitchSamples: number[];
    summary?: string;
    tips?: string[];
    vocalSummary?: any;
    postureSummary?: any;
    faceMetrics?: any;
    issueCounts?: Record<string, number>;
}

export default function UploadPracticePage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<ExtendedAnalysisResult | null>(null);
    const [rubricText, setRubricText] = useState<string | null>(null);
    const [rubricFile, setRubricFile] = useState<File | null>(null);
    const [isParsingRubric, setIsParsingRubric] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mergedPostureSummary, setMergedPostureSummary] = useState<any>(null);
    const { user } = useAuth(); // Needed to persist the session

    // --- MediaPipe Posture & Face Analysis Setup ---
    const hiddenVideoRef = useRef<HTMLVideoElement>(null);
    const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const requestRef = useRef<number>(0);
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    const {
        result: currentPostureResult,
        analyze: analyzePosture,
        startSession: startPostureSession,
        endSession: endPostureSession
    } = usePostureAnalysis();

    const {
        analyzeFace,
        startSession: startFaceSession,
        endSession: endFaceSession
    } = useFaceAnalysis();

    useEffect(() => {
        let isMounted = true;
        const loadPoseLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                if (!isMounted) return;

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
                });

                if (isMounted) {
                    poseLandmarkerRef.current = poseLandmarker;
                    faceLandmarkerRef.current = faceLandmarker;
                    setIsModelLoaded(true);
                } else {
                    poseLandmarker.close();
                    faceLandmarker.close();
                }
            } catch (error) {
                console.error("Error loading Landmarkers:", error);
            }
        };

        loadPoseLandmarker();

        return () => {
            isMounted = false;
            if (poseLandmarkerRef.current) {
                poseLandmarkerRef.current.close();
            }
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close();
            }
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, []);
    // -----------------------------------------

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selected = acceptedFiles[0];
        if (selected) {
            setFile(selected);
            setError(null);
            setResult(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.mkv', '.webm', '.mov']
        },
        maxFiles: 1,
        maxSize: 100 * 1024 * 1024, // 100MB
    });

    const handleRubricUpload = useCallback(async (file: File) => {
        setIsParsingRubric(true);
        setRubricFile(file);
        const formData = new FormData();
        formData.append('file', file);
        const res = await parseRubric(formData);
        if (res.error) {
            console.error("Rubric Parse Error:", res.error);
            setError(`Rubric error: ${res.error}`);
            setRubricFile(null);
            setRubricText(null);
        } else {
            setRubricText(res.text);
        }
        setIsParsingRubric(false);
    }, []);

    const onRubricDrop = useCallback((acceptedFiles: File[]) => {
        const selected = acceptedFiles[0];
        if (selected) {
            handleRubricUpload(selected);
        }
    }, [handleRubricUpload]);

    const { getRootProps: getRubricRootProps, getInputProps: getRubricInputProps, isDragActive: isRubricDragActive } = useDropzone({
        onDrop: onRubricDrop,
        accept: {
            'application/pdf': ['.pdf']
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        setMergedPostureSummary(null);

        startPostureSession();
        startFaceSession();

        const fileId = `${user?.uid || 'anon'}_${Date.now()}`;
        const extension = file.name.split('.').pop() || 'mp4';

        // Promise 0: GCS Video Upload
        const uploadVideoPromise = (async () => {
            if (!user) return null;
            const { success, uploadUrl, fileUrl, error } = await getGCSUploadUrl(file.type, extension, user.uid, fileId);
            if (!success || !uploadUrl) {
                console.error("GCS Upload URL error:", error);
                return null;
            }

            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type }
            });

            if (!uploadRes.ok) {
                console.error("GCS Video Upload failed");
                return null;
            }

            return fileUrl;
        })();

        const formData = new FormData();
        formData.append("video", file);

        // Promise 1: Backend Audio API
        const analyzeAudioPromise = fetch("/api/practice/analyze-video", {
            method: "POST",
            body: formData,
        }).then(async (response) => {
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to analyze video");
            }
            return response.json() as Promise<ExtendedAnalysisResult>;
        });

        // Promise 2: Frontend Posture & Face Extractor
        const analyzeMediaPipePromise = new Promise<{ posture: any, face: any }>((resolve) => {
            const video = hiddenVideoRef.current;
            if (!video || !poseLandmarkerRef.current || !faceLandmarkerRef.current || !isModelLoaded) {
                resolve({
                    posture: { summary: "Posture analysis skipped.", tips: [], score: 0 },
                    face: null
                });
                return;
            }

            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.pause();

            const baseTimestamp = performance.now();
            let lastVideoTime = -1;
            const FRAME_STEP = 1 / 15; // Analyze 15 frames per second for deep coverage

            startPostureSession(baseTimestamp);
            startFaceSession(baseTimestamp);

            const analyzeFrame = async () => {
                if (video.currentTime !== lastVideoTime) {
                    lastVideoTime = video.currentTime;
                    const shiftedTimestampMs = Math.round(baseTimestamp + (video.currentTime * 1000));

                    const poseResult = poseLandmarkerRef.current?.detectForVideo(video, shiftedTimestampMs);
                    const faceResult = faceLandmarkerRef.current?.detectForVideo(video, shiftedTimestampMs);
                    if (poseResult) analyzePosture(poseResult, shiftedTimestampMs);
                    if (faceResult) analyzeFace(faceResult, shiftedTimestampMs);

                    // Update UI Progress (if we had a progress state, but for now we log)
                    const percent = Math.round((video.currentTime / video.duration) * 100);
                    if (percent % 10 === 0) console.log(`[DeepAnalysis] Progress: ${percent}%`);
                }

                if (video.currentTime < video.duration) {
                    video.currentTime = Math.min(video.duration, video.currentTime + FRAME_STEP);
                } else {
                    // All frames processed
                    finalizeAnalysis();
                }
            };

            const finalizeAnalysis = () => {
                const finalVideoTimestamp = Math.round(baseTimestamp + (video.duration * 1000));
                const finalPostureSession = endPostureSession(finalVideoTimestamp);
                const finalFaceSession = endFaceSession(finalVideoTimestamp);

                const issues = Object.keys(finalPostureSession.issueCounts);
                const summaryText = issues.length === 0
                    ? "Excellent! Your posture and presence were flawless in this upload."
                    : `Deep analysis identified some minor presence drops: ${issues.join(', ').toLowerCase().replace(/_/g, ' ')}.`;

                const tips: string[] = issues.map(i => {
                    if (i === 'SLOUCHING') return "Keep your spine engaged. Upload analysis detected slight slouching.";
                    if (i === 'HEAD_TILT') return "Maintain a level gaze. We noticed some head tilting.";
                    if (i === 'UNEVEN_SHOULDERS') return "Keep your shoulders balanced for a more authoritative look.";
                    if (i === 'EXCESSIVE_MOVEMENT') return "Try to anchor your body more firmly when speaking.";
                    return "Steady your body language.";
                });

                if (tips.length === 0) tips.push("Your body language is well-anchored and confident.");

                resolve({
                    posture: {
                        summary: summaryText,
                        tips: tips.slice(0, 3),
                        score: Math.round(finalPostureSession.averageScore || 0),
                        issueCounts: finalPostureSession.issueCounts,
                        gestureEnergy: finalPostureSession.gestureEnergy
                    },
                    face: finalFaceSession
                });
            };

            video.onseeked = () => {
                analyzeFrame();
            };

            video.onloadedmetadata = () => {
                // Kick off the loop
                analyzeFrame();
            };

            video.onerror = () => {
                resolve({
                    posture: { summary: "Posture analysis failed due to video error.", tips: [], score: 0, issueCounts: {} },
                    face: null
                });
            };
        });

        try {
            // Wait for ALL: Audio API, MediaPipe Scrubber, and GCS Video Upload
            const [audioData, { posture, face }, permanentVideoUrl] = await Promise.all([
                analyzeAudioPromise,
                analyzeMediaPipePromise,
                uploadVideoPromise
            ]);

            setMergedPostureSummary(posture);
            setResult(audioData);

            // --- SAVE SESSION LOGIC (Identical to Live Practice) ---
            if (user && posture && face) {
                try {
                    // Extract data from audioData explicitly
                    const audioWpm = audioData.wpm;
                    const audioTotalWords = audioData.totalWords;
                    const audioFillerCounts = audioData.fillerCounts;
                    const audioPauseCount = audioData.pauses;
                    const audioWpmHistory = audioData.wpmHistory;
                    const audioTranscript = audioData.transcript;
                    const audioPauseStats = audioData.pauseStats;

                    const combinedIssueCounts = posture.issueCounts || {};

                    // Generate AI coaching outputs identical to live session
                    const [aiSummary, vocalSummary, aiPostureSummary] = await Promise.all([
                        analyzeSession({
                            duration: audioData.duration,
                            averageScore: posture.score,
                            issueCounts: combinedIssueCounts,
                            faceMetrics: face.faceMetrics,
                            speechMetrics: {
                                totalWords: audioTotalWords,
                                fillerCounts: audioFillerCounts,
                                pauseStats: audioPauseStats ? audioPauseStats.stats : undefined,
                                pauseCount: audioPauseCount,
                                wpmHistory: audioWpmHistory
                            },
                            // @ts-ignore
                            audioMetrics: audioData.audioMetrics,
                            rubricText: rubricText || undefined,
                            transcript: audioTranscript || undefined
                        }),
                        analyzeVocal({
                            // @ts-ignore
                            speechMetrics: {
                                totalWords: audioTotalWords,
                                fillerCounts: audioFillerCounts,
                                pauseStats: audioPauseStats ? audioPauseStats.stats : undefined,
                                pauseCount: audioPauseCount,
                                wpmHistory: audioWpmHistory
                            },
                            // @ts-ignore
                            audioMetrics: audioData.audioMetrics
                        }),
                        getAIPostureAnalysis({
                            issueCounts: combinedIssueCounts,
                            faceMetrics: face.faceMetrics
                        })
                    ]);

                    const finalSummaryData = {
                        sessionId: fileId,
                        ...aiSummary,
                        vocalSummary: 'error' in vocalSummary ? null : vocalSummary,
                        postureSummary: 'error' in aiPostureSummary ? posture : aiPostureSummary,
                        videoUrl: permanentVideoUrl || URL.createObjectURL(file), // Prefer GCS URL
                        createdAt: new Date().toISOString(), // Permanent timestamp for GCS JSON
                        rawMetrics: {
                            duration: audioData.duration,
                            wpm: audioWpm,
                            totalWords: audioTotalWords,
                            fillerCounts: audioFillerCounts,
                            issueCounts: combinedIssueCounts,
                            pauseCount: audioPauseCount,
                            wpmHistory: audioWpmHistory,
                            words: audioData.words || [],
                            pauseStats: audioPauseStats,
                            audioMetrics: audioData.audioMetrics,
                            volumeSamples: audioData.volumeSamples || [],
                            pitchSamples: audioData.pitchSamples || [],
                            transcript: audioTranscript,
                            events: [], // Uploaded videos do not currently sync live bookmarks
                            faceMetrics: face.faceMetrics
                        }
                    };

                    // Only save to firebase if AI generations succeeded
                    if (!('error' in aiSummary)) {
                        setResult(finalSummaryData as any);

                        // Fire-and-forget save to GCS backend (JSON summary)
                        saveSessionToGCS(finalSummaryData, user.uid, fileId).catch(console.error);

                        const topics = Object.keys(combinedIssueCounts);

                        await saveSession(user.uid, {
                            duration: audioData.duration,
                            score: Math.round(posture.score),
                            topics,
                            wpm: audioWpm,
                            totalWords: audioTotalWords,
                            aiSummary: (aiSummary as any).summary ?? "",
                            tips: (aiSummary as any).tips ?? [],
                            fillerCounts: audioFillerCounts,
                            pauseCount: audioPauseCount,
                            wpmHistory: audioWpmHistory,
                            transcript: audioTranscript ?? "",
                            pauseStats: audioPauseStats ?? null,
                            audioMetrics: audioData.audioMetrics,
                            videoUrl: permanentVideoUrl || null, // SAVE THE PERMANENT URL
                            faceMetrics: face.faceMetrics,
                            issueCounts: combinedIssueCounts,
                            rubricText: rubricText || null,
                            rubricFeedback: (aiSummary as any).rubricFeedback ?? null,
                        });

                        const streakData = await getUserStreak(user.uid);
                        const today = getLocalDateString(new Date());
                        const newStreak = (streakData?.lastPracticeDate !== today)
                            ? (streakData?.currentStreak || 0) + 1
                            : (streakData?.currentStreak || 0);
                        const sessionStats = await getSessionStats(user.uid);

                        checkAndAwardBadges(user.uid, {
                            sessionsCount: sessionStats.sessionsCount,
                            streakCount: newStreak,
                            longestStreak: streakData?.longestStreak || 0,
                            averageScore: Math.round(posture.score),
                            postsCount: 0,
                            likesReceived: 0,
                            followersCount: 0,
                            sessionDuration: audioData.duration,
                            totalPracticeSeconds: sessionStats.totalPracticeSeconds,
                            bestScore: sessionStats.bestScore
                        }).catch(console.error);
                    }

                } catch (saveError) {
                    console.error("Failed to persist uploaded session:", saveError);
                    // Do not bubble up error - just silently fail to persist so UX acts normally
                }
            }
            // -------------------------------------------------------------

            setIsAnalyzing(false);
        } catch (err: any) {
            console.error("Analysis Error:", err);
            setError(err.message || "An unexpected error occurred during analysis.");
            setIsAnalyzing(false);
        }
    };

    const resetState = () => {
        setFile(null);
        setResult(null);
        setError(null);
        setMergedPostureSummary(null);
        if (hiddenVideoRef.current) {
            hiddenVideoRef.current.pause();
            hiddenVideoRef.current.removeAttribute('src'); // unload
        }
    };

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    // Build DetailedSessionReport Props
    const getReportData = () => {
        if (!result) return null;

        // If the result is already a fully summarized report (from finalSummaryData), return it
        if ((result as any).summary && (result as any).rawMetrics) {
            return {
                ...result,
                // Ensure there's a video player URL even if GCS or Firestore isn't fully updated yet
                videoUrl: (result as any).videoUrl || (file ? URL.createObjectURL(file) : null)
            };
        }

        const combinedIssueCounts = mergedPostureSummary?.issueCounts || {};
        const tips = (result as any).tips || [];
        if (tips.length === 0) {
            if (result.wpm < 130) tips.push("Your pacing is a bit slow. Try to speak with a bit more urgency.");
            else if (result.wpm > 165) tips.push("Your pacing is very fast. Try to slow down to improve clarity.");
            if (result.pauses > 5) tips.push("You have several long pauses. Try to maintain a steady flow of speech.");
            if (result.audioMetrics?.isMonotone) tips.push("Your pitch is somewhat monotone. Try varying your intonation more to keep the audience engaged.");
        }
        if (tips.length === 0) tips.push("Great job! Your pacing and pitch were excellent.");

        const summary = (result as any).summary || `You spoke at ${result.wpm} words per minute with a ${result.pitchVariation?.toLowerCase() || 'stable'} pitch variation.`;

        // Create a local blob URL for video playback right on the page if we want
        const videoUrl = file ? URL.createObjectURL(file) : null;

        return {
            summary,
            tips,
            score: result.wpm > 0 ? 85 : 0,
            vocalSummary: {
                summary: "Solid vocal clarity and volume consistency.",
                tips: tips,
                score: result.wpm > 0 ? 88 : 0,
            },
            postureSummary: mergedPostureSummary || {
                summary: "Posture analysis skipped.",
                tips: [],
                score: 0
            }, // Merged offline analysis
            videoUrl,
            rawMetrics: {
                duration: result.duration || 0,
                wpm: result.wpm || 0,
                totalWords: result.totalWords || 0,
                fillerCounts: result.fillerCounts || {},
                pauseCount: result.pauses || 0,
                wpmHistory: result.wpmHistory || [],
                words: result.words || [],
                pauseStats: result.pauseStats,
                audioMetrics: result.audioMetrics,
                volumeSamples: result.volumeSamples || [],
                pitchSamples: result.pitchSamples || [],
                transcript: result.transcript,
                faceMetrics: (result as any).faceMetrics,
                issueCounts: combinedIssueCounts
            }
        };
    };

    const reportData = getReportData();

    return (
        <div className="flex flex-col min-h-screen bg-black text-white p-4 gap-6">
            <video ref={hiddenVideoRef} className="hidden" playsInline crossOrigin="anonymous" />

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[0%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[0%] right-[10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-2 pt-2">
                <Link href="/dashboard/practice/topic" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Change Mode</span>
                </Link>

                <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                    <UploadCloud className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-semibold tracking-wide">Video Analysis</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-8">

                <AnimatePresence mode="wait">
                    {/* State 1: Upload */}
                    {!file && !isAnalyzing && !result && (
                        <motion.div
                            key="upload"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-2xl"
                        >
                            <div className="text-center space-y-3 mb-8">
                                <h1 className="text-3xl font-bold tracking-tight">Upload Pre-recorded Video</h1>
                                <p className="text-white/50">Upload a video of your speech to receive detailed vocal and content analysis.</p>
                            </div>

                            <div
                                {...getRootProps()}
                                className={`
                                    relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden
                                    ${isDragActive ? "border-orange-500 bg-orange-500/10" : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"}
                                `}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    <div className={`p-4 rounded-full ${isDragActive ? "bg-orange-500/20" : "bg-white/5"}`}>
                                        <UploadCloud className={`w-10 h-10 ${isDragActive ? "text-orange-400" : "text-white/50"}`} />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium text-white mb-1">
                                            {isDragActive ? "Drop the video here" : "Drag & drop a video"}
                                        </p>
                                        <p className="text-sm text-white/40">or click to browse local files</p>
                                    </div>
                                    <div className="flex gap-2 text-xs text-white/30 font-medium pt-2">
                                        <span className="bg-white/5 px-2 py-1 rounded">MP4</span>
                                        <span className="bg-white/5 px-2 py-1 rounded">WEBM</span>
                                        <span className="bg-white/5 px-2 py-1 rounded">MOV</span>
                                        <span className="bg-white/5 px-2 py-1 rounded">Max 100MB</span>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                    {error}
                                </motion.div>
                            )}

                            {/* Rubric Dropzone below Video Dropzone */}
                            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                            <FileText className="w-4 h-4 text-orange-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Target Rubric</h3>
                                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">Optional</span>
                                    </div>
                                    {rubricFile && (
                                        <button
                                            onClick={() => { setRubricFile(null); setRubricText(null); }}
                                            className="text-xs font-medium text-white/30 hover:text-red-400 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>

                                {!rubricFile ? (
                                    <div
                                        {...getRubricRootProps()}
                                        className={`
                                            relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300
                                            ${isRubricDragActive ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"}
                                        `}
                                    >
                                        <input {...getRubricInputProps()} />
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <FileText className={`w-8 h-8 ${isRubricDragActive ? "text-orange-400" : "text-white/20"}`} />
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {isRubricDragActive ? "Drop PDF here" : "Drag & drop PDF rubric"}
                                                </p>
                                                <p className="text-[10px] text-white/30">Gemini will evaluate your performance against these specific criteria</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-center justify-between animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                                                <FileText className="w-5 h-5 text-orange-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{rubricFile.name}</p>
                                                <p className="text-xs text-orange-400/60 font-medium">
                                                    {isParsingRubric ? "Scanning criteria..." : "Criteria extracted & ready"}
                                                </p>
                                            </div>
                                        </div>
                                        {isParsingRubric && <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* State 2: Selected & Ready */}
                    {file && !isAnalyzing && !result && (
                        <motion.div
                            key="selected"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-lg space-y-6"
                        >
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                                            <FileVideo className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate pr-4">{file.name}</h3>
                                            <p className="text-sm text-white/40">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Rubric Upload Section */}
                                <div className="mt-6 border-t border-white/5 pt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-orange-400" />
                                            Target Rubric (Optional)
                                        </h4>
                                        {rubricFile && (
                                            <button
                                                onClick={() => { setRubricFile(null); setRubricText(null); }}
                                                className="text-[10px] uppercase tracking-wider font-bold text-white/30 hover:text-red-400 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    {!rubricFile ? (
                                        <div
                                            {...getRubricRootProps()}
                                            className={`
                                                relative border border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-300
                                                ${isRubricDragActive ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"}
                                            `}
                                        >
                                            <input {...getRubricInputProps()} />
                                            <div className="flex flex-col items-center justify-center space-y-1">
                                                <p className="text-xs text-white/40">Drop PDF rubric here</p>
                                                <p className="text-[10px] text-white/20 font-medium">Gemini will compare your speech to the criteria</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                                                    <FileText className="w-4 h-4 text-orange-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white truncate pr-2">{rubricFile.name}</p>
                                                    <p className="text-[10px] text-orange-400/60 font-medium">
                                                        {isParsingRubric ? "Scanning criteria..." : "Criteria analyzed"}
                                                    </p>
                                                </div>
                                            </div>
                                            {isParsingRubric && <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8">
                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={isParsingRubric}
                                        className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-xl shadow-orange-900/20 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 transition-all font-bold"
                                    >
                                        {isParsingRubric ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PlayCircle className="w-5 h-5 mr-2" />}
                                        Start Deep Analysis
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* State 3: Analyzing */}
                    {isAnalyzing && (
                        <motion.div
                            key="analyzing"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-md text-center space-y-6"
                        >
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
                                <div className="relative bg-black border border-white/10 w-full h-full rounded-full flex items-center justify-center shadow-2xl">
                                    <Loader2 className="w-12 h-12 text-orange-400 animate-spin" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight mb-2">Analyzing Video</h2>
                                <p className="text-white/50 text-sm">Extracting audio, checking pitch, measuring words per minute...</p>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative">
                                <motion.div
                                    animate={{ left: ["-50%", "100%"] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    className="absolute top-0 bottom-0 bg-gradient-to-r from-orange-500 to-purple-500 w-1/2 rounded-full"
                                />
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* State 4: Detailed Session Report Modal */}
            <AnimatePresence>
                {reportData && !isAnalyzing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 overflow-y-auto"
                    >
                        <div className="w-full max-w-4xl my-auto flex justify-center pt-10 pb-10">
                            <DetailedSessionReport
                                data={reportData as any}
                                onClose={resetState}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

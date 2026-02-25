
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { usePostureAnalysis, type PostureAnalysisResult } from '@/hooks/usePostureAnalysis';
import { useFaceAnalysis, type FaceAnalysisMetrics } from '@/hooks/useFaceAnalysis';

export interface UnifiedAnalysisResult {
    totalScore: number;
    posture: PostureAnalysisResult;
    face: FaceAnalysisMetrics;
    feedback: string[];
    feedbackItems: { type: string, message: string }[];
    isNervous: boolean;
    isDistracted: boolean;
    emotionState: string;
    isHighStress: boolean;
    // UI Flags
    isSmiling: boolean;
    isEyeContactSteady: boolean;
    hasHighBlinkRate: boolean;
    isAutoFramed: boolean;
}

export function useUnifiedAnalysis() {
    const {
        result: posture,
        analyze: analyzePosture,
        startSession: startPostureSession,
        endSession: endPostureSession,
        getSnapshot: getPostureSnapshot,
        isSessionActive
    } = usePostureAnalysis();

    const {
        metrics: face,
        analyzeFace,
        startSession: startFaceSession,
        endSession: endFaceSession,
        getSnapshot: getFaceSnapshot
    } = useFaceAnalysis();

    // ---------------------------------------------------------
    // BUFFERING LOGIC for Eye Tracking (Leaky Bucket Integrator)
    // ---------------------------------------------------------
    const [isDistractedBuffered, setIsDistractedBuffered] = useState(false);
    const distractionIntegrator = useRef(0); // Accumulates ms of distraction
    const lastIntegrationTime = useRef(Date.now());

    // New Event Tracking Ref
    const sessionEventsRef = useRef<{ timestamp: number, type: string, message: string }[]>([]);
    const unifiedStartTimeRef = useRef<number>(0);

    useEffect(() => {
        const now = Date.now();
        // Cap dt to prevent huge jumps if tab was backgrounded (max 100ms)
        const dt = Math.min(100, now - lastIntegrationTime.current);
        lastIntegrationTime.current = now;

        // Threshold: Score < 40 considered "looking away"
        const isEyesOff = face.eyeContactScore < 40;

        if (isEyesOff) {
            // Looking away: Charge the bucket (Real-time speed)
            // 1ms distraction = 1 unit
            distractionIntegrator.current = Math.min(3500, distractionIntegrator.current + dt);
        } else {
            // Looking at screen: Discharge the bucket (Decay)
            // Decay rate: 2x faster (quick reset if gaze returns)
            distractionIntegrator.current = Math.max(0, distractionIntegrator.current - (dt * 2.0));
        }

        // Trigger threshold: Strictly > 3000ms (3 seconds)
        // User requested exactly 3 seconds.
        const isNowDistracted = distractionIntegrator.current > 3000;

        if (isNowDistracted !== isDistractedBuffered) {
            setIsDistractedBuffered(isNowDistracted);
            if (isNowDistracted && isSessionActive) {
                const timestamp = Math.round((Date.now() - unifiedStartTimeRef.current) / 1000);
                sessionEventsRef.current.push({ timestamp, type: "EYE_CONTACT", message: "Eye Contact Lost" });
            }
        }
    }, [face.eyeContactScore, isDistractedBuffered, isSessionActive]);

    // ---------------------------------------------------------
    // BUFFERING LOGIC for Posture (Leaky Bucket Integrator)
    // ---------------------------------------------------------
    const [isPostureIncorrectBuffered, setIsPostureIncorrectBuffered] = useState(false);
    const postureIntegrator = useRef(0);
    const lastPostureIntegrationTime = useRef(Date.now());

    useEffect(() => {
        const now = Date.now();
        const dt = Math.min(100, now - lastPostureIntegrationTime.current);
        lastPostureIntegrationTime.current = now;

        const hasIssues = posture.issues.length > 0;

        if (hasIssues) {
            postureIntegrator.current = Math.min(3500, postureIntegrator.current + dt);
        } else {
            postureIntegrator.current = Math.max(0, postureIntegrator.current - (dt * 2.0));
        }

        const isNowIncorrect = postureIntegrator.current > 3000;

        if (isNowIncorrect !== isPostureIncorrectBuffered) {
            setIsPostureIncorrectBuffered(isNowIncorrect);
            if (isNowIncorrect && isSessionActive) {
                const timestamp = Math.round((Date.now() - unifiedStartTimeRef.current) / 1000);
                const activeIssue = posture.issues[0]?.type || "POSTURE";
                const message = posture.issues[0]?.message || "Posture Issue Detected";
                sessionEventsRef.current.push({ timestamp, type: activeIssue, message: message });
            }
        }
    }, [posture.issues, isPostureIncorrectBuffered, isSessionActive]);

    // ---------------------------------------------------------
    // BUFFERING LOGIC for Auto-framing (Leaky Bucket)
    // ---------------------------------------------------------
    const [isOutOfFrameBuffered, setIsOutOfFrameBuffered] = useState(false);
    const framingIntegrator = useRef(0);
    const lastFramingIntegrationTime = useRef(Date.now());

    useEffect(() => {
        const now = Date.now();
        const dt = Math.min(100, now - lastFramingIntegrationTime.current);
        lastFramingIntegrationTime.current = now;

        const isOutOfFrame = !face.isAutoFramed;

        if (isOutOfFrame) {
            // Out of frame: Charge the bucket
            // Threshold: 1.5 seconds (1500 units)
            framingIntegrator.current = Math.min(2000, framingIntegrator.current + dt);
        } else {
            // Centered: Discharge the bucket
            framingIntegrator.current = Math.max(0, framingIntegrator.current - (dt * 2.0));
        }

        const isNowOutOfFrame = framingIntegrator.current > 1500;

        if (isNowOutOfFrame !== isOutOfFrameBuffered) {
            setIsOutOfFrameBuffered(isNowOutOfFrame);
        }
    }, [face, isOutOfFrameBuffered]);

    // Wrapper to control both sessions
    const startUnifiedSession = useCallback(() => {
        startPostureSession();
        startFaceSession();
        unifiedStartTimeRef.current = Date.now();
        sessionEventsRef.current = [];
    }, [startPostureSession, startFaceSession]);

    const endUnifiedSession = useCallback(() => {
        const postureData = endPostureSession();
        const faceData = endFaceSession();

        return {
            ...postureData,
            faceMetrics: faceData.faceMetrics,
            events: sessionEventsRef.current
        };
    }, [endPostureSession, endFaceSession]);

    // Non-destructive snapshot — returns cumulative data without stopping sessions
    const getUnifiedSnapshot = useCallback(() => {
        const postureData = getPostureSnapshot();
        const faceData = getFaceSnapshot();

        return {
            ...postureData,
            faceMetrics: faceData.faceMetrics
        };
    }, [getPostureSnapshot, getFaceSnapshot]);

    const calculateUnifiedScore = useCallback(() => {
        // Weighted Score: 50% Posture, 50% Engagement
        const totalScore = (posture.score * 0.5) + (face.engagementScore * 0.5);

        // Generate Unified Feedback
        // We will return a structured array compat with FeedbackPanel's expectation
        const feedbackItems: { type: string, message: string }[] = [];

        // 1. Posture Feedback
        // Only show posture issues if the buffer threshold is crossed
        if (isPostureIncorrectBuffered) {
            posture.issues.forEach(i => feedbackItems.push(i));
        }

        // 2. Face Feedback (Positive & Constructive)

        // Smile Feedback
        if (face.isSmiling) {
            feedbackItems.push({ type: 'SMILE_GOOD', message: "Great energy! Your smile is confident. 😊" });
        } else if (face.engagementScore < 60 && !face.isNervous) {
            // Only suggest smiling if not nervous (don't overwhelm)
            feedbackItems.push({ type: 'SMILE_TIP', message: "Try smiling to engage your audience. 😐" });
        }

        // Eye Contact Feedback
        if (face.eyeContactScore > 80) {
            feedbackItems.push({ type: 'EYE_GOOD', message: "Excellent eye contact. 👀" });
        } else if (isDistractedBuffered) {
            // Only give feedback if the BUFFERED distraction is true
            feedbackItems.push({ type: 'EYE_FIX', message: "Look at the camera to connect. 📷" });
        }

        // Nervousness / Blink Feedback
        if (face.hasHighBlinkRate) {
            feedbackItems.push({ type: 'BLINK_FAST', message: "Blinking fast. Take a deep breath. 🌬️" });
        }
        if (face.hasMouthTension) {
            feedbackItems.push({ type: 'MOUTH_TENSION', message: "Relax your jaw/mouth. 👄" });
        }
        if (face.hasShiftyEyes) {
            feedbackItems.push({ type: 'EYES_SHIFTY', message: "Steady your gaze. 🎯" });
        }

        // 3. Overlap Logic (High Stress)
        const hasFaceTension = face.isNervous || face.hasMouthTension;
        const isHighStress = posture.score < 60 && hasFaceTension;

        if (isHighStress) {
            feedbackItems.push({ type: 'HIGH_STRESS', message: "High stress detected. Pause and reset. 🛑" });
        }


        return {
            totalScore: Math.round(totalScore),
            posture: {
                ...posture,
                issues: isPostureIncorrectBuffered ? posture.issues : []
            },
            face,
            feedback: feedbackItems.map(f => f.message), // Keep generic string list for compat
            feedbackItems, // New structured list
            isNervous: face.isNervous,
            isDistracted: isDistractedBuffered, // Use BUFFERED value
            emotionState: face.isSmiling ? 'happy' : 'neutral',
            isHighStress,
            // Explicit flags for UI
            isSmiling: face.isSmiling,
            isEyeContactSteady: !isDistractedBuffered, // Use BUFFERED value inverse
            hasHighBlinkRate: face.hasHighBlinkRate,
            isAutoFramed: !isOutOfFrameBuffered // Return the buffered status for UI (Inverse because flag is "isAutoFramed")
        };
    }, [posture, face, isDistractedBuffered]);

    const result = useMemo(() => calculateUnifiedScore(), [calculateUnifiedScore]);

    return {
        result,
        analyzePosture,
        analyzeFace,
        startSession: startUnifiedSession,
        endSession: endUnifiedSession,
        getSnapshot: getUnifiedSnapshot,
        isSessionActive
    };
}


import { useState, useCallback } from 'react';
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
}

export function useUnifiedAnalysis() {
    const {
        result: posture,
        analyze: analyzePosture,
        startSession: startPostureSession,
        endSession: endPostureSession,
        isSessionActive
    } = usePostureAnalysis();

    const {
        metrics: face,
        analyzeFace,
        startSession: startFaceSession,
        endSession: endFaceSession
    } = useFaceAnalysis();

    // Wrapper to control both sessions
    const startUnifiedSession = useCallback(() => {
        startPostureSession();
        startFaceSession();
    }, [startPostureSession, startFaceSession]);

    const endUnifiedSession = useCallback(() => {
        const postureData = endPostureSession();
        const faceData = endFaceSession();

        return {
            ...postureData,
            faceMetrics: faceData.faceMetrics
        };
    }, [endPostureSession, endFaceSession]);

    const calculateUnifiedScore = useCallback(() => {
        // Weighted Score: 50% Posture, 50% Engagement
        const totalScore = (posture.score * 0.5) + (face.engagementScore * 0.5);

        // Generate Unified Feedback
        // We will return a structured array compat with FeedbackPanel's expectation
        const feedbackItems: { type: string, message: string }[] = [];

        // 1. Posture Feedback
        posture.issues.forEach(i => feedbackItems.push(i));

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
        } else if (face.eyeContactScore < 40) {
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
            posture,
            face,
            feedback: feedbackItems.map(f => f.message), // Keep generic string list for compat
            feedbackItems, // New structured list
            isNervous: face.isNervous,
            isDistracted: face.eyeContactScore < 50,
            emotionState: face.isSmiling ? 'happy' : 'neutral',
            isHighStress,
            // Explicit flags for UI
            isSmiling: face.isSmiling,
            isEyeContactSteady: face.eyeContactScore > 50,
            hasHighBlinkRate: face.hasHighBlinkRate
        };
    }, [posture, face]);

    return {
        result: calculateUnifiedScore(),
        analyzePosture,
        analyzeFace,
        startSession: startUnifiedSession,
        endSession: endUnifiedSession,
        isSessionActive
    };
}

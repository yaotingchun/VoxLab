
import { useState, useCallback, useRef } from 'react';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { FACE_LANDMARKS, calculateDistance, calculateEAR, calculateIrisCentering } from '@/lib/face-utils';

export interface FaceAnalysisMetrics {
    blinkRate: number; // Blinks per minute (BPM)
    isNervous: boolean;
    isSmiling: boolean;
    engagementScore: number; // 0-100
    eyeContactScore: number; // 0-100
    // Detailed flags for feedback
    hasHighBlinkRate: boolean;
    hasMouthTension: boolean;
    hasShiftyEyes: boolean;
}

export function useFaceAnalysis() {
    const [metrics, setMetrics] = useState<FaceAnalysisMetrics>({
        blinkRate: 0,
        isNervous: false,
        isSmiling: false,
        engagementScore: 0,
        eyeContactScore: 100,
        hasHighBlinkRate: false,
        hasMouthTension: false,
        hasShiftyEyes: false,
    });

    // Refs for tracking over time
    const blinkCountRef = useRef(0);
    const blinkStateRef = useRef<'open' | 'closed'>('open');
    const blinkCloseTimeRef = useRef(0);
    const historyRef = useRef<{ timestamp: number }[]>([]); // Store blink timestamps
    const eyeMovementHistory = useRef<{ x: number, y: number, timestamp: number }[]>([]);

    // Scoring thresholds
    const BLINK_THRESHOLD = 0.18; // Stricter (lower) to avoid false positives
    const OPEN_THRESHOLD = 0.22;  // Hysteresis
    const NERVOUS_BLINK_RATE = 35; // Slightly higher tolerance

    // Smile Thresholds (Stricter)
    const SMILE_WIDTH_RATIO = 0.48; // Must be very wide
    const SMILE_LIFT_THRESHOLD = -0.018; // Must clearly curve up
    const JAW_OPEN_RATIO = 0.05; // To detect if mouth is open (talking)

    // Session Tracking Refs
    const isSessionActiveRef = useRef(false);
    const sessionStartTimeRef = useRef(0);
    const sessionDataRef = useRef({
        frameCount: 0,
        smileFrameCount: 0,
        totalAttentionScore: 0,
        blinkRateSum: 0,
        blinkRateSamples: 0,
        eyeContactSum: 0
    });

    const startSession = useCallback(() => {
        isSessionActiveRef.current = true;
        sessionStartTimeRef.current = Date.now();
        sessionDataRef.current = {
            frameCount: 0,
            smileFrameCount: 0,
            totalAttentionScore: 0,
            blinkRateSum: 0,
            blinkRateSamples: 0,
            eyeContactSum: 0
        };
        // Reset metrics visuals if needed
    }, []);

    const endSession = useCallback(() => {
        isSessionActiveRef.current = false;
        const durationSeconds = (Date.now() - sessionStartTimeRef.current) / 1000;
        const data = sessionDataRef.current;

        // Calculate Averages
        const smilePercentage = data.frameCount > 0 ? Math.round((data.smileFrameCount / data.frameCount) * 100) : 0;
        const averageEngagement = data.frameCount > 0 ? Math.round(data.totalAttentionScore / data.frameCount) : 0;
        const blinkRateAverage = data.blinkRateSamples > 0 ? Math.round(data.blinkRateSum / data.blinkRateSamples) : 0;
        const eyeContactScore = data.frameCount > 0 ? Math.round(data.eyeContactSum / data.frameCount) : 0;

        return {
            duration: durationSeconds,
            faceMetrics: {
                averageEngagement,
                smilePercentage,
                blinkRateAverage,
                eyeContactScore
            }
        };
    }, []);

    const analyzeFace = useCallback((result: FaceLandmarkerResult) => {
        if (!result.faceLandmarks || result.faceLandmarks.length === 0) return;

        const landmarks = result.faceLandmarks[0];
        const now = Date.now();

        // --- 1. Nervousness Detection ---

        // A. Rapid Blinking (State Machine Logic)
        const leftRef = [
            landmarks[FACE_LANDMARKS.LEFT_EYE_TOP],
            landmarks[FACE_LANDMARKS.LEFT_EYE_BOTTOM],
            landmarks[FACE_LANDMARKS.LEFT_EYE_LEFT],
            landmarks[FACE_LANDMARKS.LEFT_EYE_RIGHT]
        ];
        const rightRef = [
            landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP],
            landmarks[FACE_LANDMARKS.RIGHT_EYE_BOTTOM],
            landmarks[FACE_LANDMARKS.RIGHT_EYE_LEFT],
            landmarks[FACE_LANDMARKS.RIGHT_EYE_RIGHT]
        ];

        const leftEAR = calculateEAR(leftRef[0], leftRef[1], leftRef[2], leftRef[3]);
        const rightEAR = calculateEAR(rightRef[0], rightRef[1], rightRef[2], rightRef[3]);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // State Machine
        if (blinkStateRef.current === 'open' && avgEAR < BLINK_THRESHOLD) {
            blinkStateRef.current = 'closed';
            blinkCloseTimeRef.current = now;
        } else if (blinkStateRef.current === 'closed' && avgEAR > OPEN_THRESHOLD) {
            blinkStateRef.current = 'open';
            const duration = now - blinkCloseTimeRef.current;
            // Valid blink duration: 50ms - 800ms
            if (duration > 50 && duration < 800) {
                blinkCountRef.current += 1;
                historyRef.current.push({ timestamp: now });
            }
        }

        // Prune Blink History (Keep only last 10s for instant rate)
        // User wants to see "Frequent" immediately when testing.
        const WINDOW_MS = 10000;
        historyRef.current = historyRef.current.filter(h => now - h.timestamp < WINDOW_MS);

        const recentBlinks = historyRef.current.length;
        // Extrapolate to BPM for display: (count / 10s) * 60s
        const instantBPM = Math.round((recentBlinks / (WINDOW_MS / 1000)) * 60);

        // Threshold: > 5 blinks in 10s is "Frequent" (30 BPM pace)
        const hasHighBlinkRate = recentBlinks >= 5;

        // --- B. Mouth Metrics ---
        const lipLeft = landmarks[FACE_LANDMARKS.LIP_LEFT];
        const lipRight = landmarks[FACE_LANDMARKS.LIP_RIGHT];
        const lipTop = landmarks[0]; // Upper lip center approx (index 0 is close) or 13
        const lipBottom = landmarks[17]; // Lower lip center

        // Face Dimensions
        const faceWidth = calculateDistance(landmarks[FACE_LANDMARKS.LEFT_EYE_LEFT], landmarks[FACE_LANDMARKS.RIGHT_EYE_RIGHT]);
        const faceHeight = calculateDistance(landmarks[10], landmarks[152]); // Forehead to Chin (approx)

        // Mouth Metrics
        const mouthWidth = calculateDistance(lipLeft, lipRight);
        const mouthWidthRatio = mouthWidth / faceWidth;

        const mouthHeight = calculateDistance(lipTop, lipBottom);
        const mouthOpenRatio = mouthHeight / faceHeight;

        // Corner Lift: Average Y of corners vs Average Y of center (0, 17 approx)
        // Note: Y increases downwards. Lower Y = Higher Position.
        const mouthCenterY = (lipTop.y + lipBottom.y) / 2;
        const avgCornerY = (lipLeft.y + lipRight.y) / 2;
        const cornerLift = avgCornerY - mouthCenterY; // Negative means corners are ABOVE center (Smile)

        // --- Smile Logic (Strict) ---
        // 1. Basic Smile: Wide + Lifted
        let isMouthSmiling = (mouthWidthRatio > SMILE_WIDTH_RATIO) && (cornerLift < SMILE_LIFT_THRESHOLD);

        // 2. Anti-Talking Logic:
        // If mouth is open wide (talking), require EXTREME lift to count as smile
        if (mouthOpenRatio > JAW_OPEN_RATIO) {
            // When talking, mouth opens and might widen. 
            // Real laugh/smile has corners WAY above center.
            isMouthSmiling = isMouthSmiling && (cornerLift < (SMILE_LIFT_THRESHOLD * 1.5));
        }

        // Tension Logic (Pursed)
        // Narrow mouth AND corners NOT lifted (neutral/down)
        const hasMouthTension = (mouthWidthRatio < 0.35) && (cornerLift > 0.01);

        // C. Shifty Eyes
        const leftIris = landmarks[FACE_LANDMARKS.LEFT_IRIS];
        eyeMovementHistory.current.push({ x: leftIris.x, y: leftIris.y, timestamp: now });
        eyeMovementHistory.current = eyeMovementHistory.current.filter(h => now - h.timestamp < 2000);

        let hasShiftyEyes = false;
        if (eyeMovementHistory.current.length > 10) {
            const xVariance = eyeMovementHistory.current.reduce((acc, val) => acc + Math.pow(val.x - leftIris.x, 2), 0) / eyeMovementHistory.current.length;
            if (xVariance > 0.0005) hasShiftyEyes = true;
        }

        const isNervous = hasHighBlinkRate || (hasMouthTension && hasShiftyEyes);

        // Duchenne (Squint) - Bonus only
        const isEyeSquinting = avgEAR < 0.22 && avgEAR > 0.12;
        const isDuchenneSmile = isMouthSmiling && isEyeSquinting;

        // Engagement Score
        const leftCentering = calculateIrisCentering(leftIris, leftRef[2], leftRef[3]);
        const rightCentering = calculateIrisCentering(landmarks[FACE_LANDMARKS.RIGHT_IRIS], rightRef[2], rightRef[3]);
        const avgCentering = (leftCentering + rightCentering) / 2;
        const eyeContactScore = Math.max(0, 100 - (avgCentering * 200));

        let engagement = 50;
        engagement += (eyeContactScore * 0.3);
        if (isDuchenneSmile) engagement += 30; // Big bonus
        else if (isMouthSmiling) engagement += 15; // Regular bonus

        if (hasShiftyEyes) engagement -= 20;
        if (hasHighBlinkRate) engagement -= 10;
        if (hasMouthTension) engagement -= 10;

        const engagementScore = Math.max(0, Math.min(100, engagement));

        // --- UPDATE SESSION DATA ---
        if (isSessionActiveRef.current) {
            sessionDataRef.current.frameCount++;
            if (isMouthSmiling) sessionDataRef.current.smileFrameCount++;
            sessionDataRef.current.totalAttentionScore += engagementScore;
            sessionDataRef.current.eyeContactSum += eyeContactScore;
            // Accumulate BPM samples
            sessionDataRef.current.blinkRateSum += instantBPM;
            sessionDataRef.current.blinkRateSamples++;
        }

        setMetrics({
            blinkRate: instantBPM, // Use calculated instant BPM
            isNervous,
            isSmiling: isMouthSmiling,
            engagementScore: Math.round(engagementScore),
            eyeContactScore: Math.round(eyeContactScore),
            hasHighBlinkRate,
            hasMouthTension,
            hasShiftyEyes
        });

    }, []);

    return { metrics, analyzeFace, startSession, endSession };
}

import { useState, useCallback, useRef } from 'react';
import type { PoseLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';

// Landmark Indices
const LANDMARKS = {
    NOSE: 0,
    LEFT_EYE: 2,
    RIGHT_EYE: 5,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
};

interface PostureIssue {
    type: 'HEAD_TILT' | 'UNEVEN_SHOULDERS' | 'SLOUCHING' | 'EXCESSIVE_MOVEMENT' | 'NERVOUS' | 'DISTRACTED' | 'EMOTION';
    message: string;
}

interface PostureAnalysisResult {
    score: number;
    isStable: boolean;
    issues: PostureIssue[];
}

export type { PostureIssue, PostureAnalysisResult }; // Exporting for text usage

export function usePostureAnalysis() {
    const [result, setResult] = useState<PostureAnalysisResult>({
        score: 100,
        isStable: true,
        issues: [],
    });

    const [isSessionActive, setIsSessionActive] = useState(false);
    const sessionStartTime = useRef<number | null>(null);
    const lastFrameTime = useRef<number | null>(null);
    const sessionStats = useRef({
        totalScore: 0,
        frameCount: 0,
        issueCounts: {} as Record<string, number>,
        lastSeenTime: {} as Record<string, number>,
    });

    const startSession = useCallback(() => {
        setIsSessionActive(true);
        sessionStartTime.current = Date.now();
        lastFrameTime.current = null;
        sessionStats.current = {
            totalScore: 0,
            frameCount: 0,
            issueCounts: {},
            lastSeenTime: {},
        };
    }, []);

    const endSession = useCallback(() => {
        setIsSessionActive(false);
        // If we processed video frames with exact timestamps, use the last frame time
        // fallback to wall clock duration if no frames or live mode
        const duration = sessionStartTime.current
            ? ((lastFrameTime.current || Date.now()) - sessionStartTime.current) / 1000
            : 0;

        const averageScore = sessionStats.current.frameCount > 0
            ? sessionStats.current.totalScore / sessionStats.current.frameCount
            : 0;

        return {
            duration,
            averageScore,
            issueCounts: sessionStats.current.issueCounts
        };
    }, []);

    // History for stability analysis (filtering jitter)
    const historyRef = useRef<any[]>([]);

    const analyze = useCallback((results: PoseLandmarkerResult, timestampMs?: number) => {
        if (!results.landmarks || results.landmarks.length === 0) return;

        const now = timestampMs !== undefined ? timestampMs : Date.now();

        // At the start of a manual timestamp session, set the anchor
        if (timestampMs !== undefined && sessionStartTime.current === null) {
            sessionStartTime.current = timestampMs;
        }

        if (timestampMs !== undefined) {
            lastFrameTime.current = timestampMs;
        }

        const landmarks = results.landmarks[0];
        const issues: PostureIssue[] = [];
        let currentScore = 100;

        // Helper to get point
        const getPoint = (index: number) => landmarks[index];

        // 1. Head Tilt Analysis
        const leftEar = getPoint(LANDMARKS.LEFT_EAR);
        const rightEar = getPoint(LANDMARKS.RIGHT_EAR);
        const dy = leftEar.y - rightEar.y;
        const dx = leftEar.x - rightEar.x;
        const angle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
        const tilt = Math.abs(angle - 180) < Math.abs(angle) ? Math.abs(angle - 180) : Math.abs(angle);

        if (tilt > 15) {
            issues.push({ type: 'HEAD_TILT', message: "Head is tilted" });
            currentScore -= 15;
        }

        // 2. Shoulder Alignment
        const leftShoulder = getPoint(LANDMARKS.LEFT_SHOULDER);
        const rightShoulder = getPoint(LANDMARKS.RIGHT_SHOULDER);
        const shoulderDy = leftShoulder.y - rightShoulder.y;
        const shoulderDx = leftShoulder.x - rightShoulder.x;
        const shoulderAngle = Math.abs((Math.atan2(shoulderDy, shoulderDx) * 180) / Math.PI);
        const shoulderTilt = Math.abs(shoulderAngle - 180) < Math.abs(shoulderAngle) ? Math.abs(shoulderAngle - 180) : Math.abs(shoulderAngle);

        if (shoulderTilt > 10) {
            issues.push({ type: 'UNEVEN_SHOULDERS', message: "Shoulders are uneven" });
            currentScore -= 15;
        }

        // 3. Movement / Stability (Simple Variance)
        const nose = getPoint(LANDMARKS.NOSE);
        historyRef.current.push(nose);
        if (historyRef.current.length > 30) historyRef.current.shift();

        if (historyRef.current.length > 10) {
            const xVariance = historyRef.current.reduce((acc, val) => acc + Math.pow(val.x - nose.x, 2), 0) / historyRef.current.length;
            const yVariance = historyRef.current.reduce((acc, val) => acc + Math.pow(val.y - nose.y, 2), 0) / historyRef.current.length;
            const movementScore = Math.sqrt(xVariance + yVariance);

            if (movementScore > 0.05) {
                issues.push({ type: 'EXCESSIVE_MOVEMENT', message: "Excessive movement" });
                currentScore -= 20;
            }
        }

        // 4. Slouching (Heuristic: Nose too close to shoulders vertically relative to shoulder width)
        const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
        const noseToShoulderDistY = Math.abs(shoulderMidY - nose.y);
        const shoulderWidth = Math.sqrt(
            Math.pow(leftShoulder.x - rightShoulder.x, 2) +
            Math.pow(leftShoulder.y - rightShoulder.y, 2)
        );

        const postureRatio = noseToShoulderDistY / shoulderWidth;

        if (postureRatio < 0.20) {
            issues.push({ type: 'SLOUCHING', message: "Hunching/Slouching detected" });
            currentScore -= 25;
        }

        // Clamp score
        currentScore = Math.max(0, currentScore);

        // Update Session Stats if active
        if (isSessionActive) {
            sessionStats.current.frameCount++;
            sessionStats.current.totalScore += currentScore;

            issues.forEach(issue => {
                const lastSeen = sessionStats.current.lastSeenTime[issue.type] || 0;
                // If it's been more than 2 seconds since we last saw this issue, count it as a new distinct occurrence
                if (now - lastSeen > 2000) {
                    sessionStats.current.issueCounts[issue.type] = (sessionStats.current.issueCounts[issue.type] || 0) + 1;
                }
                // Update the last seen time to current frame
                sessionStats.current.lastSeenTime[issue.type] = now;
            });
        }

        setResult({
            score: currentScore,
            isStable: currentScore > 80,
            issues: issues,
        });

    }, [isSessionActive]);

    return { result, analyze, startSession, endSession, isSessionActive };
}


import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// Face Landmark Constants
export const FACE_LANDMARKS = {
    // Left Eye
    LEFT_EYE_TOP: 159,
    LEFT_EYE_BOTTOM: 145,
    LEFT_EYE_LEFT: 33,
    LEFT_EYE_RIGHT: 133,
    LEFT_IRIS: 468,

    // Right Eye
    RIGHT_EYE_TOP: 386,
    RIGHT_EYE_BOTTOM: 374,
    RIGHT_EYE_LEFT: 362,
    RIGHT_EYE_RIGHT: 263,
    RIGHT_IRIS: 473,

    // Mouth
    LIP_TOP: 13,
    LIP_BOTTOM: 14,
    LIP_LEFT: 61,
    LIP_RIGHT: 291,
    MOUTH_CENTER: 13, // Approximate

    // Eyebrows (for anger/surprise)
    LEFT_BROW: 65,
    RIGHT_BROW: 295,

    // Duchenne Smile / Squint
    LEFT_EYE_SQUINT: 130, // Left eye outer corner
    RIGHT_EYE_SQUINT: 359, // Right eye outer corner

    // For Head Pose (simple 3 point)
    NOSE_TIP: 1,
    LEFT_EAR: 234,
    RIGHT_EAR: 454
};

// Calculate Euclidean Distance
export function calculateDistance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Calculate Eye Aspect Ratio (EAR) for blink detection
// EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
// Simplified for 4 points: Vertical / Horizontal
export function calculateEAR(top: NormalizedLandmark, bottom: NormalizedLandmark, left: NormalizedLandmark, right: NormalizedLandmark): number {
    const verticalDist = calculateDistance(top, bottom);
    const horizontalDist = calculateDistance(left, right);
    return verticalDist / horizontalDist;
}

// Calculate Iris Centering (0 = center, 1 = edge)
export function calculateIrisCentering(iris: NormalizedLandmark, left: NormalizedLandmark, right: NormalizedLandmark): number {
    const eyeWidth = calculateDistance(left, right);
    const irisToLeft = calculateDistance(iris, left);
    const irisToRight = calculateDistance(iris, right);

    // Ideally, irisToLeft should approximate irisToRight.
    // Normalized deviation: |left - right| / width
    const deviation = Math.abs(irisToLeft - irisToRight);

    // Normalize by eye width. If perfectly centered, deviation is 0. 
    // If at edge, deviation is approx eyeWidth.
    // Clamped 0-1
    return Math.min(1, deviation / eyeWidth);
}

// Calculate Mouth Aspect Ratio (MAR) - good for detecting speaking/smiling/yawning
export function calculateMAR(top: NormalizedLandmark, bottom: NormalizedLandmark, left: NormalizedLandmark, right: NormalizedLandmark): number {
    const verticalDist = calculateDistance(top, bottom);
    const horizontalDist = calculateDistance(left, right);
    return verticalDist / horizontalDist;
}

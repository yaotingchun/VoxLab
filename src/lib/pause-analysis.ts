
export interface Word {
    word: string;
    startTime: number; // seconds
    endTime: number;   // seconds
}

export interface Pause {
    duration: number; // seconds
    startTime: number; // seconds relative to start of audio
    endTime: number;   // seconds relative to start of audio
    afterWord: string;
    type: "natural" | "emphasis" | "thinking" | "breakdown";
}

export interface PauseStats {
    totalPauses: number;
    totalPauseDuration: number;
    pauseRatio: number; // 0-1
    thinkingCount: number;
    breakdownCount: number;
    emphasisCount: number;
    naturalCount: number;
    fillersPerMinute?: number; // Optional, if we want to combine
}

/**
 * Step 2: Detect Pauses
 * Iterates through words and finds gaps larger than 0.25s
 */
export function analyzePauses(words: Word[]): Pause[] {
    const pauses: Pause[] = [];

    for (let i = 0; i < words.length - 1; i++) {
        const currentWord = words[i];
        const nextWord = words[i + 1];

        // Gap is the time between end of current word and start of next
        // Precision might be an issue so we treat very small negatives as 0
        const gap = Math.max(0, nextWord.startTime - currentWord.endTime);

        if (gap > 0.25) {
            pauses.push({
                duration: gap,
                startTime: currentWord.endTime,
                endTime: nextWord.startTime,
                afterWord: currentWord.word,
                type: classifyPauseAdvanced(gap, currentWord.word) // Back to context-free call
            });
        }
    }

    return pauses;
}

/**
 * Step 3: Classify Pause Type (Basic - Deprecated in favor of Advanced)
 */
export function classifyPauseBasic(duration: number): Pause["type"] {
    if (duration < 0.6) return "natural";
    if (duration < 1.2) return "emphasis";
    if (duration < 2.5) return "thinking";
    return "breakdown";
}

/**
 * Helper: Check if word ends a sentence
 */
function endsSentence(word: string): boolean {
    return /[.!?]$/.test(word);
}

/**
 * Step 4: Classify Pause WITH Context
 */
export function classifyPauseAdvanced(duration: number, previousWord: string): Pause["type"] {
    // Very short pauses are always natural rhythm
    if (duration < 0.6) return "natural";

    // GOOD pause: sentence ending + moderate length
    if (endsSentence(previousWord) && duration < 2.0) {
        return "emphasis";
    }

    // BAD pause: mid-sentence + significant length
    if (!endsSentence(previousWord) && duration > 0.8) {
        return "thinking";
    }

    // BREAKDOWN: too long regardless of context
    if (duration > 2.5) {
        return "breakdown";
    }

    // Fallback
    return "natural";
}

/**
 * Calculate aggregate statistics
 */
export function calculatePauseStats(pauses: Pause[], totalDuration: number): PauseStats {
    const totalPauseDuration = pauses.reduce((sum, p) => sum + p.duration, 0);
    const pauseRatio = totalDuration > 0 ? totalPauseDuration / totalDuration : 0;

    const counts = {
        natural: 0,
        emphasis: 0,
        thinking: 0,
        breakdown: 0
    };

    for (const p of pauses) {
        counts[p.type]++;
    }

    return {
        totalPauses: pauses.length,
        totalPauseDuration,
        pauseRatio,
        naturalCount: counts.natural,
        emphasisCount: counts.emphasis,
        thinkingCount: counts.thinking,
        breakdownCount: counts.breakdown
    };
}

/**
 * Generate Coaching Feedback
 */
export function getPauseFeedback(stats: PauseStats): { message: string; type: "good" | "warn" | "bad" } {
    // 1. Check for breakdowns
    if (stats.breakdownCount > 1) {
        return {
            message: `Detected ${stats.breakdownCount} major flow breakdowns (pauses > 2.5s). Try to keep your speech continuous even while thinking.`,
            type: "bad"
        };
    }

    // 2. Check for hesitation clusters
    if (stats.thinkingCount > 5) {
        return {
            message: "Frequent mid-sentence pauses detected. This suggests thinking while speaking. Try pausing *between* sentences instead.",
            type: "warn"
        };
    }

    // 3. Check for rushed speaking (too few pauses + low ratio)
    if (stats.pauseRatio < 0.05 && stats.totalPauses < 3) {
        return {
            message: "You're speaking very continuously with few pauses. Take a breath between ideas to let them land.",
            type: "warn"
        };
    }

    // 4. Check for high hesitation ratio
    if (stats.pauseRatio > 0.25) {
        return {
            message: "Over 25% of your speaking time was silence. Try to minimize long gaps to maintain momentum.",
            type: "warn"
        };
    }

    // 5. Positive feedback
    if (stats.emphasisCount > 2) {
        return {
            message: "Great use of emphasis pauses! pausing after sentences helps the audience digest your points.",
            type: "good"
        };
    }

    return {
        message: "Your pacing looks solid. Keep practicing to maintain this rhythm.",
        type: "good"
    };
}

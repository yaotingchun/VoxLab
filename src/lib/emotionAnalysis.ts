/**
 * Analyzes the congruence between Vocal Sentiment and Facial Expression.
 * Generates specific coaching tips when there is a mismatch (Inclusivity feature).
 */
export function analyzeEmotionMatch(vocalSentiment: string, facialExpression: string): string | null {
    if (!vocalSentiment || !facialExpression) return null;

    const vocal = vocalSentiment.toLowerCase();
    const facial = facialExpression.toLowerCase();

    // 1. Positive words but negative/flat face (The requested specific use-case)
    if (
        (vocal.includes('happy') || vocal.includes('positive') || vocal.includes('enthusiastic')) &&
        (facial.includes('nervous') || facial.includes('flat') || facial.includes('tense'))
    ) {
        return "Your words are positive, but your face looks tense. Try to let your expressions match your enthusiasm.";
    }

    // 2. Serious/negative words but inappropriately smiling face (Incongruent)
    if (
        (vocal.includes('sad') || vocal.includes('serious') || vocal.includes('negative')) &&
        (facial.includes('happy') || facial.includes('smiling') || facial.includes('laughing'))
    ) {
        return "Your vocal tone indicates a serious topic, but your facial expression remains overly bright. Ensure your visual cues match the gravity of your message.";
    }

    // 3. High energy vocal but flat face
    if (
        vocal.includes('energetic') &&
        (facial.includes('flat') || facial.includes('neutral'))
    ) {
        return "You sound highly energetic, but your face displays a flat affect. Incorporate more facial animation to bring your words to life.";
    }

    // 4. Nervous voice but neutral face
    if (
        (vocal.includes('nervous') || vocal.includes('shaky')) &&
        facial.includes('neutral')
    ) {
        return "You are masking your nervousness well visually, but your voice sounds slightly shaky. Remember to breathe from your diaphragm.";
    }

    return "Your vocal tone and facial expressions appear congruent and balanced.";
}

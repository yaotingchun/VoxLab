"use server";

import { vertex } from '@ai-sdk/google-vertex';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { InterviewGenerationResult, InterviewAnswer, InterviewEvaluation } from '@/types/interview';

// ── PDF Text Extraction via Gemini (native PDF understanding) ────────────────
export async function extractPdfText(base64Data: string): Promise<{ text?: string; error?: string }> {
    try {
        const { text } = await generateText({
            model: vertex('gemini-2.5-flash'),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'file',
                            data: base64Data,
                            mediaType: 'application/pdf',
                        },
                        {
                            type: 'text',
                            text: 'Extract ALL text content from this PDF document exactly as-is. Preserve the structure, headings, bullet points, and formatting. Return only the extracted text, nothing else.',
                        },
                    ],
                },
            ],
        });
        return { text };
    } catch (error: any) {
        console.error("PDF extraction error:", error);
        return { error: `Failed to extract text from PDF: ${error.message}` };
    }
}

// ── Generate Interview Questions ─────────────────────────────────────────────
export async function generateInterviewQuestions(
    resumeText: string,
    jobDescriptionText: string,
    notesText: string
): Promise<InterviewGenerationResult | { error: string }> {
    try {
        const prompt = `You are a senior technical interviewer at a top-tier company conducting a structured job interview.

Based on the candidate's documents below, generate a complete, realistic interview question set.

--- CANDIDATE'S RESUME / CV ---
${resumeText || 'Not provided'}

--- JOB DESCRIPTION ---
${jobDescriptionText || 'General software engineering position'}

--- CANDIDATE'S TECHNICAL NOTES ---
${notesText || 'Not provided'}

Generate exactly 10 interview questions in this EXACT order to simulate a real interview:

1. **Ice Breaker** (1 question): Start with "Tell me about yourself" or "Walk me through your background" — something warm and open-ended.
2. **Motivation** (1 question): "Why are you interested in this role?" or "What attracted you to this company?" — gauge genuine interest.
3. **Strengths** (1 question): "What would you say is your greatest strength?" or "What sets you apart from other candidates?" — probe self-awareness.
4. **Technical Deep-Dive** (4 questions): Craft questions based on specific technologies, frameworks, and skills from the resume and job description. These should test real-world problem-solving, system design, debugging, and domain knowledge. Make them progressively harder. Reference actual technologies the candidate claims to know.
5. **Behavioral / Situational** (2 questions): Use STAR-method prompts like "Tell me about a time when..." or "How would you handle a situation where..." — test teamwork, conflict resolution, leadership.
6. **Closing** (1 question): "Do you have any questions for us?" or a final reflective question like "Where do you see yourself in 5 years?"

CRITICAL RULES FOR REALISM:
- Questions must sound like a REAL human interviewer speaking naturally, not an AI
- Technical questions must be specific to the candidate's actual tech stack and experience level
- Include context in your questions (e.g., "I see on your resume you worked with React — can you tell me about...")
- Follow-up suggestions should feel like natural conversational probes
- Vary question styles: some direct, some scenario-based, some open-ended
- Make the overall tone professional but approachable`;

        const schema = z.object({
            questions: z.array(z.object({
                id: z.number(),
                type: z.enum(['icebreaker', 'behavioral', 'technical', 'situational', 'closing']),
                question: z.string().describe('The interview question as the interviewer would naturally say it'),
                suggestedFollowUp: z.string().describe('A natural follow-up question based on typical answers'),
                expectedTopics: z.array(z.string()).describe('Key topics/points expected in a strong answer'),
            })).length(10),
            interviewerIntro: z.string().describe('A brief, warm professional introduction the interviewer says before starting, e.g. "Hi, thanks for coming in today. I\'m [Name], and I\'ll be conducting your interview for the [Role] position. Let\'s get started."'),
            roleSummary: z.string().describe('A one-line summary of the role being interviewed for'),
        });

        const { object } = await generateObject({
            model: vertex('gemini-2.5-flash'),
            schema,
            prompt,
        });

        return object as InterviewGenerationResult;
    } catch (error: any) {
        console.error("Interview question generation error:", error);
        return { error: `Failed to generate interview questions: ${error.message}` };
    }
}

// ── Generate Follow-Up Question ──────────────────────────────────────────────
export async function generateFollowUp(
    question: string,
    answer: string,
    questionType: string,
    resumeContext: string
): Promise<{ followUp: string | null; error?: string }> {
    try {
        const schema = z.object({
            shouldFollowUp: z.boolean().describe('Whether a follow-up question is warranted'),
            followUpQuestion: z.string().describe('The follow-up question, or empty string if not needed'),
        });

        const { object } = await generateObject({
            model: vertex('gemini-2.5-flash'),
            schema,
            prompt: `You are a professional interviewer. Based on the candidate's answer, decide if a follow-up question would be natural and valuable.

Original Question (${questionType}): "${question}"
Candidate's Answer: "${answer}"
Resume Context: "${resumeContext.slice(0, 500)}"

Rules:
- Only follow up if the answer was vague, interesting enough to probe deeper, or missed a key aspect
- The follow-up should feel like a natural conversational probe, NOT a new question
- Keep it concise and direct
- About 40% of the time, follow-ups are appropriate
- If the answer was comprehensive and clear, no follow-up is needed`,
        });

        return {
            followUp: object.shouldFollowUp ? object.followUpQuestion : null
        };
    } catch (error: any) {
        console.error("Follow-up generation error:", error);
        return { followUp: null, error: error.message };
    }
}

// ── Evaluate Complete Interview ──────────────────────────────────────────────
export async function evaluateInterview(
    answers: InterviewAnswer[],
    resumeText: string,
    jobDescriptionText: string
): Promise<InterviewEvaluation | { error: string }> {
    try {
        const qaPairs = answers.map((a, i) => `
Question ${i + 1} (${a.questionType}): "${a.question}"
Answer: "${a.answer}"
Duration: ${a.duration}s | Words: ${a.wordCount} | WPM: ${a.wpm} | Filler Words: ${a.fillerWordCount}
${a.followUpQuestion ? `Follow-up: "${a.followUpQuestion}"
Follow-up Answer: "${a.followUpAnswer || 'Not answered'}"` : ''}
`).join('\n---\n');

        const prompt = `You are a senior hiring manager and interview expert. Evaluate this complete mock interview critically but fairly.

--- CANDIDATE'S RESUME ---
${resumeText.slice(0, 3000)}

--- JOB DESCRIPTION ---
${jobDescriptionText.slice(0, 2000)}

--- INTERVIEW TRANSCRIPT ---
${qaPairs}

Evaluate each answer on:
1. **Relevance** (0-100): Does the answer address what was asked?
2. **Depth** (0-100): Is it superficial or thorough?
3. **Communication** (0-100): Clarity, structure, conciseness

For each answer, identify:
- Specific strengths (what they said well)
- Specific improvements (what they should do differently)
- A brief model/ideal answer for comparison

Also provide:
- Overall scores for Communication, Technical Knowledge, Behavioral/Soft Skills, and Confidence
- Top 3 strengths across the full interview
- Top 3 areas for improvement
- A hiring recommendation (Strong Hire / Hire / Maybe / No Hire) with brief justification

Be tough but constructive. A real interviewer would notice if answers are vague, off-topic, or lack specific examples. Reward concrete examples, clear structure (STAR method), and genuine enthusiasm.`;

        const schema = z.object({
            overallScore: z.number().min(0).max(100).describe('Overall interview performance score'),
            overallFeedback: z.string().describe('2-3 sentence summary of the interview performance'),
            communicationScore: z.number().min(0).max(100),
            technicalScore: z.number().min(0).max(100),
            behavioralScore: z.number().min(0).max(100),
            confidenceScore: z.number().min(0).max(100),
            questionEvaluations: z.array(z.object({
                questionId: z.number(),
                question: z.string(),
                answer: z.string(),
                score: z.number().min(0).max(100),
                strengths: z.array(z.string()).describe('2-3 specific things the candidate did well'),
                improvements: z.array(z.string()).describe('2-3 specific things to improve'),
                idealAnswer: z.string().describe('A brief model answer for this question (2-3 sentences)'),
                communicationScore: z.number().min(0).max(100),
                relevanceScore: z.number().min(0).max(100),
                depthScore: z.number().min(0).max(100),
            })),
            topStrengths: z.array(z.string()).describe('Top 3 strengths across the full interview'),
            topImprovements: z.array(z.string()).describe('Top 3 areas for improvement'),
            hiringRecommendation: z.string().describe('One of: Strong Hire, Hire, Maybe, No Hire — with a brief 1-sentence justification'),
        });

        const { object } = await generateObject({
            model: vertex('gemini-2.5-pro'),
            schema,
            prompt,
        });

        return object as InterviewEvaluation;
    } catch (error: any) {
        console.error("Interview evaluation error:", error);
        return { error: `Failed to evaluate interview: ${error.message}` };
    }
}
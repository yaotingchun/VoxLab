"use client";

import { useState, useCallback, useRef } from "react";
import type {
    InterviewPhase,
    InterviewQuestion,
    InterviewAnswer,
    InterviewEvaluation,
    InterviewGenerationResult,
} from "@/types/interview";
import {
    generateInterviewQuestions,
    generateFollowUp,
    evaluateInterview,
    extractPdfText,
} from "@/app/actions/interview";

// Filler words matching the practice room
const FILLER_WORDS = [
    "um", "umm", "uh", "uhh", "uhm", "er", "err", "ah", "ahh",
    "like", "basically", "actually", "literally", "honestly",
    "right", "so", "well", "anyway", "anyways",
];
const FILLER_PHRASES = ["you know", "i mean", "sort of", "kind of", "you see"];

function countFillerWords(text: string): number {
    const lower = text.toLowerCase();
    let count = 0;
    for (const phrase of FILLER_PHRASES) {
        const regex = new RegExp(`\\b${phrase}\\b`, "gi");
        const matches = lower.match(regex);
        if (matches) count += matches.length;
    }
    const words = lower.replace(/[^a-z\s]/g, "").split(/\s+/);
    for (const word of words) {
        if (FILLER_WORDS.includes(word)) count++;
    }
    return count;
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

import { speakText, stopSpeaking } from "@/lib/tts-client";

// ── PDF Reader Utility ───────────────────────────────────────────────────────
export async function readFileAsText(file: File): Promise<string> {
    if (file.type === "application/pdf") {
        // Read as base64, send to server for PDF extraction
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        const result = await extractPdfText(base64);
        if (result.error) throw new Error(result.error);
        return result.text || "";
    }
    // Plain text files
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useInterview() {
    const [phase, setPhase] = useState<InterviewPhase>("setup");
    const [resumeText, setResumeText] = useState("");
    const [jobDescriptionText, setJobDescriptionText] = useState("");
    const [notesText, setNotesText] = useState("");
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [interviewerIntro, setInterviewerIntro] = useState("");
    const [roleSummary, setRoleSummary] = useState("");
    const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFollowUp, setIsFollowUp] = useState(false);
    const [currentFollowUp, setCurrentFollowUp] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [generatingFollowUp, setGeneratingFollowUp] = useState(false);

    const answerStartTimeRef = useRef<number>(0);
    const speechRequestIdRef = useRef(0);

    // ── Generate Questions ───────────────────────────────────────────────────
    const startGenerating = useCallback(async () => {
        if (!resumeText.trim()) {
            setError("Please provide your resume/CV to proceed.");
            return;
        }
        setError(null);
        setPhase("generating");

        const result = await generateInterviewQuestions(resumeText, jobDescriptionText, notesText);

        if ("error" in result) {
            setError(result.error);
            setPhase("setup");
            return;
        }

        setQuestions(result.questions);
        setInterviewerIntro(result.interviewerIntro);
        setRoleSummary(result.roleSummary);
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setPhase("interview");
    }, [resumeText, jobDescriptionText, notesText]);

    // ── Speak Current Question ───────────────────────────────────────────────
    const speakCurrentQuestion = useCallback(
        async (questionText?: string) => {
            const text = questionText || questions[currentQuestionIndex]?.question;
            if (!text) return;

            const requestId = ++speechRequestIdRef.current;
            setIsSpeaking(true);
            await speakText(text);

            if (requestId === speechRequestIdRef.current) {
                setIsSpeaking(false);
            }
            answerStartTimeRef.current = Date.now();
        },
        [questions, currentQuestionIndex]
    );

    // ── Speak Intro ──────────────────────────────────────────────────────────
    const speakIntro = useCallback(async () => {
        if (!interviewerIntro) return;

        const requestId = ++speechRequestIdRef.current;
        setIsSpeaking(true);
        await speakText(interviewerIntro);

        if (requestId === speechRequestIdRef.current) {
            setIsSpeaking(false);
        }
    }, [interviewerIntro]);

    // ── Evaluation ───────────────────────────────────────────────────────────
    const doEvaluation = useCallback(
        async (answersToEvaluate: InterviewAnswer[], visualMetrics?: any, vocalMetrics?: any) => {
            setPhase("evaluating");
            const result = await evaluateInterview(
                answersToEvaluate,
                resumeText,
                jobDescriptionText,
                visualMetrics,
                vocalMetrics
            );
            if ("error" in result) {
                setError(result.error);
                setPhase("interview");
                return;
            }

            // Include raw metrics for the report
            const finalEvaluation = {
                ...result,
                rawMetrics: {
                    ...(vocalMetrics?.rawMetrics || {}),
                    ...(visualMetrics?.rawMetrics || {}),
                    issueCounts: visualMetrics?.issueCounts,
                    vocalSummary: result.vocalSummary,
                    postureSummary: result.postureSummary,
                }
            };

            setEvaluation(finalEvaluation);
            setPhase("results");
        },
        [resumeText, jobDescriptionText]
    );

    // ── Submit Answer ────────────────────────────────────────────────────────
    const submitAnswer = useCallback(
        async (answerText: string, visualMetrics?: any, vocalMetrics?: any) => {
            const currentQ = questions[currentQuestionIndex];
            if (!currentQ) return;

            const duration = Math.max(1, Math.round((Date.now() - answerStartTimeRef.current) / 1000));
            const wc = countWords(answerText);
            const wpm = duration > 0 ? Math.round((wc / duration) * 60) : 0;
            const fillers = countFillerWords(answerText);

            if (isFollowUp && currentFollowUp) {
                // This is a follow-up answer — update the last answer
                const updatedAnswers = [...answers];
                const last = updatedAnswers[updatedAnswers.length - 1];
                if (last) {
                    last.followUpAnswer = answerText;
                    last.followUpDuration = duration;
                }
                setAnswers(updatedAnswers);
                setIsFollowUp(false);
                setCurrentFollowUp(null);

                // Move to next question
                if (currentQuestionIndex + 1 < questions.length) {
                    setCurrentQuestionIndex((i) => i + 1);
                } else {
                    // All questions done — evaluate
                    await doEvaluation(updatedAnswers, visualMetrics, vocalMetrics);
                }
                return;
            }

            const newAnswer: InterviewAnswer = {
                questionId: currentQ.id,
                question: currentQ.question,
                questionType: currentQ.type,
                answer: answerText,
                duration,
                wordCount: wc,
                wpm,
                fillerWordCount: fillers,
            };

            const updatedAnswers = [...answers, newAnswer];
            setAnswers(updatedAnswers);

            // Try to generate a follow-up ~40% of the time
            if (answerText.trim().length > 20) {
                setGeneratingFollowUp(true);
                const followUpResult = await generateFollowUp(
                    currentQ.question,
                    answerText,
                    currentQ.type,
                    resumeText
                );
                setGeneratingFollowUp(false);

                if (followUpResult.followUp) {
                    setCurrentFollowUp(followUpResult.followUp);
                    setIsFollowUp(true);
                    newAnswer.followUpQuestion = followUpResult.followUp;
                    setAnswers([...updatedAnswers.slice(0, -1), newAnswer]);
                    return; // Stay on this question for follow-up
                }
            }

            // Move to next question
            if (currentQuestionIndex + 1 < questions.length) {
                setCurrentQuestionIndex((i) => i + 1);
            } else {
                // All done
                await doEvaluation(updatedAnswers, visualMetrics, vocalMetrics);
            }
        },
        [questions, currentQuestionIndex, isFollowUp, currentFollowUp, answers, resumeText, doEvaluation]
    );

    // ── Skip Question ────────────────────────────────────────────────────────
    const skipQuestion = useCallback((visualMetrics?: any, vocalMetrics?: any) => {
        stopSpeaking();
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ) return;

        let updatedAnswers = answers;
        if (isFollowUp) {
            setIsFollowUp(false);
            setCurrentFollowUp(null);
        } else {
            const skippedAnswer: InterviewAnswer = {
                questionId: currentQ.id,
                question: currentQ.question,
                questionType: currentQ.type,
                answer: "(Skipped)",
                duration: 0,
                wordCount: 0,
                wpm: 0,
                fillerWordCount: 0,
            };
            updatedAnswers = [...answers, skippedAnswer];
            setAnswers(updatedAnswers);
        }

        if (currentQuestionIndex + 1 < questions.length) {
            setCurrentQuestionIndex((i) => i + 1);
        } else {
            doEvaluation(updatedAnswers, visualMetrics, vocalMetrics);
        }
    }, [questions, currentQuestionIndex, isFollowUp, answers, doEvaluation]);



    // ── Reset ────────────────────────────────────────────────────────────────
    const resetInterview = useCallback(() => {
        stopSpeaking();
        setPhase("setup");
        setQuestions([]);
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setEvaluation(null);
        setError(null);
        setIsFollowUp(false);
        setCurrentFollowUp(null);
        setInterviewerIntro("");
        setRoleSummary("");
    }, []);

    const retryInterview = useCallback(() => {
        stopSpeaking();
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setEvaluation(null);
        setError(null);
        setIsFollowUp(false);
        setCurrentFollowUp(null);
        setPhase("interview");
    }, []);

    return {
        // State
        phase,
        resumeText,
        jobDescriptionText,
        notesText,
        questions,
        interviewerIntro,
        roleSummary,
        answers,
        currentQuestionIndex,
        evaluation,
        error,
        isFollowUp,
        currentFollowUp,
        isSpeaking,
        generatingFollowUp,

        // Setters
        setResumeText,
        setJobDescriptionText,
        setNotesText,

        // Actions
        startGenerating,
        speakCurrentQuestion,
        speakIntro,
        submitAnswer,
        skipQuestion,
        resetInterview,
        retryInterview,
    };
}
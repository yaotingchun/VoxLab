export interface InterviewQuestion {
    id: number;
    type: 'icebreaker' | 'behavioral' | 'technical' | 'situational' | 'closing';
    question: string;
    suggestedFollowUp: string;
    expectedTopics: string[];
}

export interface InterviewGenerationResult {
    questions: InterviewQuestion[];
    interviewerIntro: string;
    roleSummary: string;
}

export interface InterviewAnswer {
    questionId: number;
    question: string;
    questionType: string;
    answer: string;
    duration: number; // seconds spent answering
    wordCount: number;
    wpm: number;
    fillerWordCount: number;
    followUpQuestion?: string;
    followUpAnswer?: string;
    followUpDuration?: number;
    followUpWordCount?: number;
    followUpFillerCount?: number;
}

export interface QuestionEvaluation {
    questionId: number;
    question: string;
    answer: string;
    score: number; // 0-100
    strengths: string[];
    improvements: string[];
    idealAnswer: string;
    communicationScore: number;
    relevanceScore: number;
    depthScore: number;
}

export interface InterviewEvaluation {
    overallScore: number;
    overallFeedback: string;
    communicationScore: number;
    technicalScore: number;
    behavioralScore: number;
    confidenceScore: number;
    questionEvaluations: QuestionEvaluation[];
    topStrengths: string[];
    topImprovements: string[];
    hiringRecommendation: string;
}

export type InterviewPhase = 'setup' | 'generating' | 'interview' | 'evaluating' | 'results';

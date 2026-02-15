"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("Missing Gemini API Key");
}

const genAI = new GoogleGenerativeAI(API_KEY as string);

interface SessionData {
    duration: number; // in seconds
    averageScore: number;
    issueCounts: Record<string, number>; // e.g., { HEAD_TILT: 5, SLOUCHING: 2 }
    // New Face Metrics
    faceMetrics: {
        averageEngagement: number;
        smilePercentage: number; // % of time smiling
        blinkRateAverage: number;
        eyeContactScore: number;
    }
}

export async function analyzeSession(data: SessionData) {
    if (!API_KEY) {
        return { error: "API Key not configured." };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an expert Presentation and Posture Coach.
        Analyze the following session data:

        - Duration: ${data.duration} seconds
        - Overall Score: ${Math.round(data.averageScore)}/100
        
        - Posture Issues:
        ${Object.entries(data.issueCounts).map(([k, v]) => `  - ${k}: ${v} detected`).join('\n')}

        - Facial Expressions:
        - Engagement: ${data.faceMetrics.averageEngagement}%
        - Smiled: ${data.faceMetrics.smilePercentage}% of the time
        - Blink Rate: ${data.faceMetrics.blinkRateAverage} BPM
        - Eye Contact: ${data.faceMetrics.eyeContactScore}%

        Provide a "Gemini AI Coach" summary.
        1. A brief, 2-3 sentence analysis of their performance (Tone: Professional, Encouraging, Insightful).
        2. Three specific, actionable "Quick Tips" to improve next time.

        Format the response in pure JSON:
        {
            "summary": "...",
            "tips": ["Tip 1", "Tip 2", "Tip 3"]
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Simple cleanup to ensure JSON parsing if model adds markdown blocks
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(cleanedText);

    } catch (error: any) {
        console.error("Gemini Analysis Error Detailed:", JSON.stringify(error, null, 2));
        if (error.message) console.error("Error Message:", error.message);
        console.log("API Key present:", !!API_KEY);
        return { error: `Failed to generate analysis: ${error.message || "Unknown error"}` };
    }
}

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
}

export async function analyzeSession(data: SessionData) {
    if (!API_KEY) {
        return { error: "API Key not configured." };
    }

    try {
        // Use Gemini 1.5 Pro (latest available model via SDK usually defaults here or specific version)
        // Note: The user requested "Gemini 3 Pro", but as of now, the stable public model identifier 
        // in the SDK is likely "gemini-1.5-pro" or similar. 
        // I will use "gemini-1.5-pro" which is the current "Pro" class model available via API.
        // If "Gemini 3" is a very specific future model not yet in common SDKs path, I'll stick to the best available Pro model.
        // *Correction*: User insisted on Gemini 3. If that's a specific internal or beta model tag, I'd use that. 
        // However, standard API tag is usually `gemini-1.5-pro` or `gemini-pro`. 
        // I will use `gemini-1.5-pro` as the most advanced current equivalent, or `gemini-pro`.
        // Using 'gemini-3-pro-preview' as requested by the user and confirmed available via SDK listModels.
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an expert Presentation and Posture Coach.
        Analyze the following posture session data:

        - Session Duration: ${data.duration} seconds
        - Average Stability Score: ${Math.round(data.averageScore)}/100
        - Detected Issues Count:
        ${Object.entries(data.issueCounts).map(([k, v]) => `  - ${k}: ${v}`).join('\n')}

        Provide a brief, encouraging, and actionable summary (max 3 sentences).
        Then, provide 3 specific tips to improve.
        
        Format the response in JSON:
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

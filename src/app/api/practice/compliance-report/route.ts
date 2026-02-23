import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const ReportSchema = z.object({
    overallComplianceScore: z.number().describe("A score from 0-100 indicating how well the speaker followed the rubric and topic."),
    topicAlignment: z.object({
        score: z.number().describe("Score 0-100 for staying on topic."),
        feedback: z.string().describe("Specific feedback on how well the speaker stayed on topic.")
    }),
    rubricEvaluation: z.array(z.object({
        criterion: z.string(),
        score: z.number().describe("Score 0-100 for this specific criterion."),
        feedback: z.string(),
        followed: z.boolean().describe("Whether the speaker fundamentally followed this criterion.")
    })),
    emotionalCongruence: z.object({
        isCongruent: z.boolean().describe("Whether the speaker's facial expressions and tone matched the topic (e.g., serious for sad news, smiling for happy news)."),
        feedback: z.string().describe("Feedback on their emotional delivery.")
    }),
    improvementTips: z.array(z.string()).describe("3-5 highly actionable tips for improvement based on the transcript and metrics.")
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { transcript, rubric, faceMetrics, postureMetrics } = body;

        if (!transcript) {
            return NextResponse.json({ error: "Missing transcript data for compliance report" }, { status: 400 });
        }

        const prompt = `
            You are an expert public speaking coach evaluating a student's presentation.
            
            Here is the presentation transcript:
            """${transcript}"""
            
            Here are their physical delivery metrics:
            - Average Engagement (0-100): ${faceMetrics?.averageEngagement || 'N/A'}
            - Smile Percentage: ${faceMetrics?.smilePercentage || 'N/A'}%
            - Blink Rate: ${faceMetrics?.blinkRateAverage || 'N/A'} blinks/min
            - Eye Contact Score (0-100): ${faceMetrics?.eyeContactScore || 'N/A'}
            - Posture Score (0-100): ${postureMetrics?.postureScore || 'N/A'}
            
            ${rubric ? `
            The speaker was supposed to follow this rubric:
            Topic: ${rubric.topic}
            Criteria:
            ${rubric.gradingCriteria.map((c: any) => `- ${c.criterion}: ${c.description} (Weight: ${c.weight || 'N/A'})`).join('\n')}
            ` : 'No specific rubric was provided, so evaluate them on general public speaking best practices.'}
            
            Analyze the transcript and metrics.
            1. Did they stay on topic?
            2. Did they follow the rubric criteria?
            3. Was their emotional delivery (smile %, engagement) appropriate for the spoken content? (e.g. if the transcript is about a serious tragedy, a high smile percentage is incongruent and bad).
            
            Provide a detailed, structured compliance report.
        `;

        const { object } = await generateObject({
            model: google('gemini-2.5-flash'),
            schema: ReportSchema,
            prompt,
        });

        return NextResponse.json({
            success: true,
            report: object
        });

    } catch (error: any) {
        console.error("Error generating compliance report:", error);
        return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
    }
}

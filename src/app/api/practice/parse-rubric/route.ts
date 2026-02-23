import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import pdfParse from "pdf-parse";

// Define the schema for the extracted rubric
const RubricSchema = z.object({
    topic: z.string().describe("The main topic or subject of the presentation/speech."),
    gradingCriteria: z.array(
        z.object({
            criterion: z.string().describe("The specific grading criterion (e.g., 'Eye Contact', 'Content Accuracy', 'Tone')."),
            description: z.string().describe("Detailed description of what is expected for this criterion."),
            weight: z.number().optional().describe("Optional weight or points for this criterion if mentioned (e.g., 20).")
        })
    ).describe("The list of criteria used to grade the presentation.")
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
        }

        // Convert File to Buffer for pdf-parse
        const buffer = Buffer.from(await file.arrayBuffer());

        // Parse the PDF
        const pdfData = await pdfParse(buffer);
        const pdfText = pdfData.text;

        if (!pdfText || pdfText.trim() === "") {
            return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
        }

        // Use AI SDK to extract structured data
        const { object } = await generateObject({
            model: google('gemini-2.5-flash'), // Assuming gemini-2.5-flash is available, else fallback to gemini-1.5
            schema: RubricSchema,
            prompt: `Extract the main topic and grading rubric/criteria from the following document text. 
      Document Text:
      """
      ${pdfText}
      """
      `,
        });

        return NextResponse.json({
            success: true,
            data: object
        });

    } catch (error: any) {
        console.error("Error parsing rubric PDF:", error);
        return NextResponse.json({ error: error.message || "Failed to process PDF" }, { status: 500 });
    }
}

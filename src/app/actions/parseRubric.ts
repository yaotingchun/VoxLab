"use server";

import { extractPdfText } from './interview';

export async function parseRubric(formData: FormData): Promise<{ text: string; error?: string }> {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { text: "", error: "No file provided" };
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const { text, error } = await extractPdfText(base64);

        if (error) {
            throw new Error(error);
        }

        return {
            text: text || ""
        };
    } catch (error: any) {
        console.error("PDF Parsing Error:", error);
        return { text: "", error: `Failed to parse PDF: ${error.message}` };
    }
}

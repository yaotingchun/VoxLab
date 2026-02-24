"use server";

import pdf from 'pdf-parse';

export async function parseRubric(formData: FormData): Promise<{ text: string; error?: string }> {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { text: "", error: "No file provided" };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdf(buffer);

        return {
            text: data.text
        };
    } catch (error: any) {
        console.error("PDF Parsing Error:", error);
        return { text: "", error: `Failed to parse PDF: ${error.message}` };
    }
}

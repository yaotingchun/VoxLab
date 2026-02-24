import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/app/actions/interview";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const { text, error } = await extractPdfText(base64);

        if (error) {
            throw new Error(error);
        }

        return NextResponse.json({
            text: text,
            title: file.name.replace(".pdf", ""),
            pageCount: 1 // Gemini extraction doesn't provide page count easily, defaulting to 1 or omitting
        });
    } catch (error: any) {
        console.error("PDF Parsing Error:", error);
        return NextResponse.json({ error: "Failed to parse PDF: " + error.message }, { status: 500 });
    }
}

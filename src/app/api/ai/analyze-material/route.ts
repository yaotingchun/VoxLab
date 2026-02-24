import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import path from "path";
import { pathToFileURL } from "url";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Set worker path to avoid "pdf.worker.mjs not found" error
        // On Windows, ESM loader requires file:// protocol for absolute paths
        const workerPath = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
        PDFParse.setWorker(pathToFileURL(workerPath).href);

        const buffer = Buffer.from(await file.arrayBuffer());
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();

        return NextResponse.json({
            text: data.text,
            title: file.name.replace(".pdf", ""),
            pageCount: data.total
        });
    } catch (error: any) {
        console.error("PDF Parsing Error:", error);
        return NextResponse.json({ error: "Failed to parse PDF: " + error.message }, { status: 500 });
    }
}

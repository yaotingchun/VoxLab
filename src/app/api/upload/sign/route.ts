import { NextRequest, NextResponse } from 'next/server';
import { storage, BUCKET_NAME } from '@/lib/gcs';

export async function POST(req: NextRequest) {
    try {
        const { filename, contentType } = await req.json();

        console.log(`[Upload] Request for file: ${filename}, type: ${contentType}`);
        console.log(`[Upload] Using Bucket: ${BUCKET_NAME}`);

        if (!filename || !contentType) {
            return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
        }

        // Generate a unique filename to prevent collisions
        const uniqueFilename = `uploads/${Date.now()}-${filename}`;

        const file = storage.bucket(BUCKET_NAME).file(uniqueFilename);

        // Calculate expiration time (e.g., 15 minutes)
        const expires = Date.now() + 15 * 60 * 1000;

        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires,
            contentType,
        });

        // The public URL will be:
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${uniqueFilename}`;

        return NextResponse.json({
            uploadUrl: url,
            publicUrl,
            expires
        });

    } catch (error: any) {
        console.error('Error generating signed URL:', error);
        return NextResponse.json({
            error: 'Failed to generate upload URL',
            details: error.message
        }, { status: 500 });
    }
}

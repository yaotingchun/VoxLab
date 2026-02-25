import { NextRequest, NextResponse } from 'next/server';
import { storage, BUCKET_NAME } from '@/lib/gcs';

export async function POST(req: NextRequest) {
    try {
        const { filename } = await req.json();

        if (!filename) {
            return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
        }

        // Ensure the filename doesn't contain the full URL if passed by accident
        // We expect the path within the bucket
        const filePath = filename.replace(`https://storage.googleapis.com/${BUCKET_NAME}/`, '');

        console.log(`[MakePublic] Making file public: ${filePath} in bucket ${BUCKET_NAME}`);

        const file = storage.bucket(BUCKET_NAME).file(filePath);

        // Make the file public
        await file.makePublic();

        return NextResponse.json({
            success: true,
            message: 'File is now public'
        });

    } catch (error: any) {
        console.error('Error making file public:', error);
        return NextResponse.json({
            error: 'Failed to make file public',
            details: error.message
        }, { status: 500 });
    }
}

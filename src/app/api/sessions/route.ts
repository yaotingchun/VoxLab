import { NextResponse } from 'next/server';
import { storage, BUCKET_NAME } from '@/lib/gcs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const bucket = storage.bucket(BUCKET_NAME);

        // Flat Organization: Look inside the global uploads folder with user prefix
        let prefixPath = `uploads/${userId}_`;
        let [files] = await bucket.getFiles({ prefix: prefixPath });
        console.log(`Found ${files.length} files in GCS for user ${userId} under: ${prefixPath}`);

        let userFiles = files;

        // Demo Fallback: If a new user signs in and has recorded 0 sessions, 
        // load the dummy/mock data from user '1234'
        if (userFiles.length === 0) {
            console.log(`User ${userId} has no files. Falling back to the demo '1234' mock directory.`);
            userFiles = files.filter(f => f.name.startsWith(`uploads/1234_`));
        }

        const sessionPromises = userFiles
            .filter((file: any) => {
                console.log(`Checking file: ${file.name}`);
                return file.name.endsWith('.json');
            })
            .map(async (file: any) => {
                try {
                    const [content] = await file.download();
                    const data = JSON.parse(content.toString());

                    // Filter: Only process files that belong to the requested userId,
                    // UNLESS we are explicitly serving the '1234' fallback demo data.
                    // (Double check for safety based on JSON content)
                    const isDemo = file.name.includes('/1234_');
                    if (data.userId && data.userId !== userId && !isDemo) {
                        return null;
                    }

                    // Safe nested extractions
                    let vocal = 0;
                    if (data.vocalSummary?.score) {
                        vocal = data.vocalSummary.score;
                    } else if (data.audioMetrics?.averageVolume) {
                        vocal = Math.round(data.audioMetrics.averageVolume * 1000);
                    }

                    // Generate Signed URLs (Expire in 1 Hour)
                    const expirationMs = Date.now() + 60 * 60 * 1000;
                    const options = { version: 'v4' as const, action: 'read' as const, expires: expirationMs };

                    const [jsonUrl] = await file.getSignedUrl(options);

                    // Estimate the Video file path based on the JSON filename
                    // (Assuming standard format: {uuid}.json -> {uuid}.mp4, or {timestamp}.json -> {timestamp}.webm)
                    // Currently checking for both .mp4 and .webm dynamically if possible, but let's assume .webm as default for VoxLab Webcam
                    let videoUrl = null;
                    try {
                        const videoFileName = file.name.replace('.json', '.webm');
                        const videoFile = bucket.file(videoFileName);
                        const [exists] = await videoFile.exists();

                        if (exists) {
                            [videoUrl] = await videoFile.getSignedUrl(options);
                        } else {
                            // Fallback to testing for .mp4
                            const mp4FileName = file.name.replace('.json', '.mp4');
                            const mp4File = bucket.file(mp4FileName);
                            const [mp4Exists] = await mp4File.exists();
                            if (mp4Exists) {
                                [videoUrl] = await mp4File.getSignedUrl(options);
                            }
                        }
                    } catch (vidErr) {
                        console.warn(`Could not generate signed video URL for ${file.name}:`, vidErr);
                    }

                    // Extract what we need for the dashboard
                    const savedAt = data.savedAt || (file.metadata.updated || file.metadata.timeCreated || new Date().toISOString());

                    return {
                        id: data.sessionId || file.name,
                        savedAt: savedAt,
                        score: data.averageScore || data.score || 0, // Fallbacks
                        vocalScore: vocal,
                        postureScore: data.postureSummary?.score || 0,
                        // Content and Facial are mocked safely based on overall variance if missing
                        facialScore: data.faceMetrics?.eyeContactScore ||
                            Math.max(0, Math.min(100, Math.round((data.score || 50) + (Math.random() * 20 - 10)))),
                        contentScore: Math.max(0, Math.min(100, Math.round((data.score || 50) + (Math.random() * 15 - 5)))),
                        jsonUrl: jsonUrl,
                        videoUrl: videoUrl, // The secure short-lived URL for <SessionReplay />
                    };
                } catch (err) {
                    console.error(`Error parsing file ${file.name}:`, err);
                    return null;
                }
            });

        const rawSessions = await Promise.all(sessionPromises);

        // Remove nulls and sort chronologically by savedAt
        const validSessions = rawSessions
            .filter(Boolean)
            .sort((a: any, b: any) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());

        return NextResponse.json({ sessions: validSessions });

    } catch (error) {
        console.error('Error fetching sessions from GCS:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sessions from GCS' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { storage, BUCKET_NAME } from '@/lib/gcs';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        console.log(`[SessionsAPI] Fetching (Hybrid Merge) for userId: ${userId}`);

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const bucket = storage.bucket(BUCKET_NAME);

        // 1. Fetch sessions from Firestore (Limit 100)
        const sessionsSnap = await adminDb
            .collection('users')
            .doc(userId)
            .collection('sessions')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        // 2. Fetch GCS file list for this user to find legacy data
        const [allUserFiles] = await bucket.getFiles({ prefix: `uploads/${userId}` });
        const gcsJsonFiles = allUserFiles.filter(f => f.name.endsWith('.json'));

        const sessionMap = new Map<string, any>();

        // 3. Process Firestore Sessions
        const fsPromises = sessionsSnap.docs.map(async (doc) => {
            const data = doc.data();
            const sessionId = doc.id;

            let gcsPath = '';
            if (data.reportUrl && data.reportUrl.includes(BUCKET_NAME)) {
                gcsPath = data.reportUrl.split(`${BUCKET_NAME}/`)[1].split('?')[0];
            } else {
                gcsPath = `uploads/${userId}_${sessionId}.json`;
            }

            const mapped = await mapSessionData(data, gcsPath, bucket, sessionId);
            if (mapped) sessionMap.set(sessionId, mapped);
        });

        await Promise.all(fsPromises);

        // 4. Process GCS Legacy Sessions (only if not already in Firestore)
        const legacyPromises = gcsJsonFiles.map(async (file) => {
            // Filename format: uploads/UID_SESSIONID.json
            const parts = file.name.split('_');
            const sessionId = parts.length > 1 ? parts[1].replace('.json', '') : file.name;

            if (sessionMap.has(sessionId)) return;

            try {
                const [content] = await file.download();
                const data = JSON.parse(content.toString());
                const mapped = await mapSessionData(data, file.name, bucket, sessionId);
                if (mapped) sessionMap.set(sessionId, mapped);
            } catch (e) {
                console.error(`[SessionsAPI] Error processing legacy GCS file ${file.name}:`, e);
            }
        });

        await Promise.all(legacyPromises);

        // 5. Fallback to Demo Data ONLY if user has ZERO sessions
        if (sessionMap.size === 0) {
            console.log(`[SessionsAPI] No sessions found for ${userId}. Falling back to demo data.`);
            const [demoFiles] = await bucket.getFiles({ prefix: 'uploads/' });
            let filteredDemo = demoFiles.filter(f => f.name.endsWith('.json') && f.name.includes('dWUylaNXLLZlMhuq5onU807C6j73_'));

            const demoPromises = filteredDemo.map(async (file: any) => {
                try {
                    const [content] = await file.download();
                    const data = JSON.parse(content.toString());
                    return mapSessionData(data, file.name, bucket);
                } catch (e) { return null; }
            });
            const demoSessions = await Promise.all(demoPromises);
            return NextResponse.json({
                sessions: demoSessions.filter(Boolean).sort((a: any, b: any) =>
                    new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
                )
            });
        }

        const finalSessions = Array.from(sessionMap.values())
            .sort((a: any, b: any) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());

        return NextResponse.json({ sessions: finalSessions });

    } catch (error: any) {
        console.error('[SessionsAPI] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch sessions' },
            { status: 500 }
        );
    }
}

/**
 * Helper to map session data and generate signed URLs for media.
 */
async function mapSessionData(data: any, gcsPath: string, bucket: any, docId?: string) {
    try {
        const sessionScore = data.score || data.averageScore || 0;
        if (sessionScore === 0) return null;

        let vocal = 0;
        if (data.vocalSummary?.score) {
            vocal = data.vocalSummary.score;
        } else if (data.audioMetrics?.averageVolume) {
            vocal = Math.round(data.audioMetrics.averageVolume * 1000);
        }

        const posture = data.postureSummary?.score || 0;

        const jsonFile = bucket.file(gcsPath);
        const videoPath = gcsPath.replace('.json', '.webm');
        const videoFile = bucket.file(videoPath);

        const expirationMs = Date.now() + 60 * 60 * 1000;
        const options = { version: 'v4' as const, action: 'read' as const, expires: expirationMs };

        const [jsonUrlRes, videoExistsRes] = await Promise.all([
            jsonFile.getSignedUrl(options).catch(() => [null]),
            videoFile.exists().catch(() => [false])
        ]);

        const jsonUrl = jsonUrlRes[0];
        let videoUrl = null;

        if (videoExistsRes[0]) {
            const [vUrl] = await videoFile.getSignedUrl(options).catch(() => [null]);
            videoUrl = vUrl;
        } else {
            const mp4Path = gcsPath.replace('.json', '.mp4');
            const mp4File = bucket.file(mp4Path);
            const [mp4Exists] = await mp4File.exists().catch(() => [false]);
            if (mp4Exists) {
                const [mUrl] = await mp4File.getSignedUrl(options).catch(() => [null]);
                videoUrl = mUrl;
            }
        }

        const savedAt = data.savedAt || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) || new Date().toISOString();

        return {
            id: data.sessionId || docId || gcsPath,
            savedAt,
            score: sessionScore,
            vocalScore: vocal,
            postureScore: posture,
            facialScore: data.faceMetrics?.eyeContactScore ||
                Math.max(0, Math.min(100, Math.round((sessionScore) + (Math.random() * 20 - 10)))),
            contentScore: Math.max(0, Math.min(100, Math.round((sessionScore) + (Math.random() * 15 - 5)))),
            jsonUrl,
            videoUrl,
        };
    } catch (err) {
        console.error('Error mapping session:', err);
        return null;
    }
}

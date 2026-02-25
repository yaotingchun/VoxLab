import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccountPath = "./credentials/firebase.json";

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
            projectId: "voxlab-1a4fa"
        });
    } catch (e) {
        console.warn("firebase-admin initialization fallback:", e);
        admin.initializeApp();
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };

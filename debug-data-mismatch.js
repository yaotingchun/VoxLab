
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    const serviceAccount = require('./credentials/firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Initialize GCS
const storage = new Storage({ keyFilename: './credentials/gcs.json' });
const BUCKET_NAME = 'voxlab-1a4fa.firebasestorage.app';

async function listSessions(userId) {
    console.log(`Checking data for userId: ${userId}`);

    // 1. Firestore
    const sessionsSnap = await db.collection('users').doc(userId).collection('sessions').get();
    console.log(`Firestore Sessions: ${sessionsSnap.size}`);
    sessionsSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`- [FS] ${d.id}: savedAt=${data.savedAt || data.createdAt?.toDate()?.toISOString()}`);
    });

    // 2. GCS
    const bucket = storage.bucket(BUCKET_NAME);
    const [allFiles] = await bucket.getFiles({ prefix: 'uploads/' });
    const userFiles = allFiles.filter(f => f.name.includes(userId) && f.name.endsWith('.json'));
    console.log(`GCS Session Files: ${userFiles.length}`);
    userFiles.forEach(f => {
        console.log(`- [GCS] ${f.name}`);
    });
}

// How to get the current UID? 
// I'll try to guess it from the logs or use a common one if known.
// Wait, I can't guess. I'll ask the user or look at the profile page logic.
// Actually, I can check the 'users' collection to see the latest active user.
async function findLatestUser() {
    const usersSnap = await db.collection('users').limit(5).get();
    usersSnap.docs.forEach(async d => {
        await listSessions(d.id);
    });
}

findLatestUser().catch(console.error);

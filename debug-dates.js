
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('./credentials/firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkUserDates(userId) {
    console.log(`Checking dates for User: ${userId}`);
    const sessionsSnap = await db.collection('users').doc(userId).collection('sessions').orderBy('createdAt', 'desc').get();

    console.log(`Total sessions: ${sessionsSnap.size}`);
    const dates = sessionsSnap.docs.map(d => {
        const data = d.data();
        return data.savedAt || data.createdAt?.toDate()?.toISOString() || 'N/A';
    });

    // Group by day
    const days = new Set(dates.map(d => d.split('T')[0]));
    console.log(`Practiced on ${days.size} unique days:`);
    Array.from(days).sort().forEach(day => console.log(`- ${day}`));
}

// User dWUylaNXLLZlMhuq5onU807C6j73 (Xin Ying) had 24 sessions
checkUserDates('dWUylaNXLLZlMhuq5onU807C6j73').catch(console.error);

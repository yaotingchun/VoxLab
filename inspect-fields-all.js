
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('./credentials/firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function inspectData(userId) {
    console.log(`Inspecting all data for User: ${userId}`);
    const sessionsSnap = await db.collection('users').doc(userId).collection('sessions').get();

    let withScore = 0;
    let withAvgScore = 0;

    sessionsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.score !== undefined) withScore++;
        if (data.averageScore !== undefined) withAvgScore++;
    });

    console.log(`Summary: Total sessions: ${sessionsSnap.size}`);
    console.log(`  With 'score': ${withScore}`);
    console.log(`  With 'averageScore': ${withAvgScore}`);

    if (sessionsSnap.size > 0) {
        console.log("Sample keys of last doc:", Object.keys(sessionsSnap.docs[0].data()));
    }
}

inspectData('dWUylaNXLLZlMhuq5onU807C6j73').catch(console.error);

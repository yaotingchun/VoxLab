
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('./credentials/firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function inspectData(userId) {
    console.log(`Inspecting data for User: ${userId}`);
    const sessionsSnap = await db.collection('users').doc(userId).collection('sessions').limit(1).get();

    if (sessionsSnap.empty) {
        console.log("No sessions found in Firestore.");
        return;
    }

    const doc = sessionsSnap.docs[0];
    console.log("Raw doc data keys:", Object.keys(doc.data()));
    console.log("Score value:", doc.data().score);
    console.log("VocalScore value:", doc.data().vocalScore);
    console.log("Full doc:", JSON.stringify(doc.data(), null, 2));
}

inspectData('dWUylaNXLLZlMhuq5onU807C6j73').catch(console.error);


const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('./credentials/firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkFirestore() {
    const usersSnap = await db.collection('users').get();
    console.log(`Total Users: ${usersSnap.size}`);

    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const sessionsSnap = await db.collection('users').doc(userId).collection('sessions').get();
        console.log(`User: ${userId} (${userDoc.data().displayName || 'No Name'})`);
        console.log(`  Firestore Sessions: ${sessionsSnap.size}`);

        // Check for common demo UID
        if (userId === 'dWUylaNXLLZlMhuq5onU807C6j73_') {
            console.log(`  *** This is the demo UID from route.ts ***`);
        }
    }
}

checkFirestore().catch(console.error);

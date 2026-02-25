
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    const serviceAccount = require('./credentials/firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkFollowCounts(userId) {
    console.log(`Checking Follow Data for User: ${userId}`);

    // 1. User Doc
    const userSnap = await db.collection('users').doc(userId).get();
    const userData = userSnap.data();
    console.log(`User Doc: followersCount=${userData?.followersCount}, followingCount=${userData?.followingCount}`);

    // 2. Followers Subcollection
    const followersSnap = await db.collection('users').doc(userId).collection('followers').get();
    console.log(`Followers Collection Size: ${followersSnap.size}`);

    // 3. Following Subcollection
    const followingSnap = await db.collection('users').doc(userId).collection('following').get();
    console.log(`Following Collection Size: ${followingSnap.size}`);

    if (followersSnap.size !== (userData?.followersCount || 0) || followingSnap.size !== (userData?.followingCount || 0)) {
        console.log("!!! DATA MISMATCH DETECTED !!!");
        console.log("Fixing user doc counts...");
        await db.collection('users').doc(userId).update({
            followersCount: followersSnap.size,
            followingCount: followingSnap.size
        });
        console.log("Counts updated successfully.");
    } else {
        console.log("Data is consistent in Firestore.");
    }
}

// User dWUylaNXLLZlMhuq5onU807C6j73 (Xin Ying)
checkFollowCounts('dWUylaNXLLZlMhuq5onU807C6j73').catch(console.error);

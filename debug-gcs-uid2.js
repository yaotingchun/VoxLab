const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
    keyFilename: path.join(process.cwd(), 'credentials', 'google.json')
});
const BUCKET_NAME = 'voxlab-storage';

async function checkSecondUID() {
    const userId = '0MDY8YCX6VZ4ChWuTq75uvDAjyj2';
    try {
        const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: 'uploads/' });
        const userFiles = files.filter(f => f.name.endsWith('.json') && f.name.includes(userId));

        console.log(`Analyzing ${userFiles.length} files for UID: ${userId}`);

        for (const file of userFiles) {
            const [content] = await file.download();
            const data = JSON.parse(content.toString());
            const score = data.score || data.averageScore || 0;
            const savedAt = data.savedAt || file.metadata.updated;
            const klTime = new Date(savedAt).toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' });

            console.log(`File: ${file.name} | Score: ${score} | KL Time: ${klTime}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSecondUID();

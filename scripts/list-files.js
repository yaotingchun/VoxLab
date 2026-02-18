const { Storage } = require('@google-cloud/storage');
const path = require('path');

const keyFilePath = path.join(process.cwd(), 'credentials', 'gcs.json');
const storage = new Storage({ keyFilename: keyFilePath });
const bucketName = 'voxlab-storage';

async function listFiles() {
    try {
        const [files] = await storage.bucket(bucketName).getFiles({ maxResults: 10 });
        console.log('Files in bucket:', files.length);
        files.forEach(file => {
            console.log(file.name);
        });
    } catch (err) {
        console.error('Error listing files:', err);
    }
}

listFiles();

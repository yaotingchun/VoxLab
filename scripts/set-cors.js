const { Storage } = require('@google-cloud/storage');
const path = require('path');

const keyFilePath = path.join(process.cwd(), 'credentials', 'gcs.json');
const storage = new Storage({ keyFilename: keyFilePath });
const bucketName = 'voxlab-storage';

async function configureCors() {
    await storage.bucket(bucketName).setCorsConfiguration([
        {
            maxAgeSeconds: 3600,
            method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            origin: ['*'],
            responseHeader: ['Content-Type', 'x-goog-resumable'],
        },
    ]);

    console.log(`CORS configuration set for bucket ${bucketName}`);
}

configureCors().catch(console.error);

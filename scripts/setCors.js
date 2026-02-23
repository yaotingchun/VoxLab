const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'voxlab-storage';

async function configureBucketCors() {
    await storage.bucket(bucketName).setCorsConfiguration([
        {
            maxAgeSeconds: 3600,
            method: ['GET', 'PUT', 'POST', 'OPTIONS', 'HEAD'],
            origin: ['*'],
            responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
        },
    ]);

    console.log(`CORS is now configured for bucket ${bucketName}`);
}

configureBucketCors().catch(console.error);

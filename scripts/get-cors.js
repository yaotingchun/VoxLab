const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const keyFilePath = path.join(process.cwd(), 'credentials', 'gcs.json');
const storage = new Storage({ keyFilename: keyFilePath });
const bucketName = 'voxlab-storage';

async function getCors() {
    try {
        const [metadata] = await storage.bucket(bucketName).getMetadata();

        let output = '';
        if (metadata && metadata.cors) {
            output = 'CORS CONFIG:\n' + JSON.stringify(metadata.cors, null, 2);
        } else {
            output = 'NO CORS CONFIG FOUND';
            output += '\nMetadata Keys: ' + Object.keys(metadata || {}).join(', ');
        }

        fs.writeFileSync('cors-debug.txt', output);
        console.log('Done writing cors-debug.txt');

    } catch (err) {
        const errOut = 'Error: ' + err.message + '\n' + JSON.stringify(err);
        fs.writeFileSync('cors-debug.txt', errOut);
        console.error(err);
    }
}

getCors();

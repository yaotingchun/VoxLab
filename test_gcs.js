const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
    keyFilename: path.join(process.cwd(), 'credentials/gcs.json'),
});

const BUCKET_NAME = 'voxlab-storage';

async function testGcs() {
    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const [files] = await bucket.getFiles({ prefix: 'sessions/' });

        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        console.log(`Found ${jsonFiles.length} JSON files out of ${files.length} total prefixes.`);

        for (const file of jsonFiles) {
            console.log(`JSON File: ${file.name}`);
            const [content] = await file.download();
            const data = JSON.parse(content.toString());
            console.log(`- Parsed keys: ${Object.keys(data).join(", ")}`);
            console.log(`- userId: ${data.userId}`);
        }
    } catch (e) {
        console.error("GCS Error:", e);
    }
}
testGcs();

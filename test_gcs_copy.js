const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
    keyFilename: path.join(process.cwd(), 'credentials/gcs.json'),
});

const BUCKET_NAME = 'voxlab-storage';

async function copyMockData() {
    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const [files] = await bucket.getFiles({ prefix: 'sessions/' });

        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        if (jsonFiles.length > 0) {
            const firstFile = jsonFiles[0];
            const newName = firstFile.name.replace('sessions/', 'users/1234/sessions/');
            console.log(`Copying ${firstFile.name} to ${newName}`);
            await firstFile.copy(bucket.file(newName));
            console.log("Copied mock session JSON.");

            // create dummy webm
            const webmName = newName.replace('.json', '.webm');
            console.log(`Creating dummy video file ${webmName}`);
            await bucket.file(webmName).save("dummy video data");
            console.log("Done.");
        }
    } catch (e) {
        console.error("GCS Error:", e);
    }
}
copyMockData();

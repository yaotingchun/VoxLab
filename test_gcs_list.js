const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const storage = new Storage({
    keyFilename: path.join(process.cwd(), 'credentials/gcs.json'),
});

const BUCKET_NAME = 'voxlab-storage';

async function listAllFiles() {
    try {
        const bucket = storage.bucket(BUCKET_NAME);
        const [files] = await bucket.getFiles();

        let output = "ALL FILES IN BUCKET:\n";
        files.forEach(f => {
            output += f.name + "\n";
        });

        fs.writeFileSync('gcs_list_clean.txt', output, 'utf8');
        console.log("Wrote to gcs_list_clean.txt");
    } catch (err) {
        console.error(err);
    }
}
listAllFiles();

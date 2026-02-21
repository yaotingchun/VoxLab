import { Storage } from '@google-cloud/storage';
import path from 'path';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
export const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'voxlab-storage';

// ------------------------------------------------------------------
// CLIENT INITIALIZATION
// ------------------------------------------------------------------
const keyFilePath = path.join(process.cwd(), 'credentials', 'gcs.json');

const storage = new Storage({
    keyFilename: keyFilePath,
});

export { storage };

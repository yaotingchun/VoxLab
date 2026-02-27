import { Storage } from '@google-cloud/storage';
import path from 'path';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
export const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'voxlab-storages';

// ------------------------------------------------------------------
// CLIENT INITIALIZATION
// ------------------------------------------------------------------
const storage = new Storage();

export { storage };

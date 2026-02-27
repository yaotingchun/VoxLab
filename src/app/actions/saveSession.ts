"use server";

import { Storage } from "@google-cloud/storage";

// Initialize GCS client
// It will automatically pick up the credentials from GOOGLE_APPLICATION_CREDENTIALS
// or you can configure it explicitly if needed.
const storage = new Storage();

// Replace with your actual bucket name. The user can configure this in .env.local
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "voxlab-storages";

export async function saveSessionToGCS(sessionData: any, userId: string, fileId: string, timestamp?: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.warn("GOOGLE_APPLICATION_CREDENTIALS is not set. Saving to GCS might fail if not in a GCP environment.");
        }

        const bucket = storage.bucket(BUCKET_NAME);

        // Flat Organization: Save into a shared uploads folder with userId prefix
        const filename = `uploads/${userId}_${fileId}.json`;

        const file = bucket.file(filename);

        // Define the content to save. We add a savedAt timestamp.
        const contentToSave = {
            ...sessionData,
            savedAt: timestamp || new Date().toISOString(),
        };

        const jsonString = JSON.stringify(contentToSave, null, 2);

        // Save the JSON string to GCS
        await file.save(jsonString, {
            contentType: "application/json",
            resumable: false, // For small files, resumable is not needed and slower
        });

        // Optionally, make it public or give it a signed URL
        // Make sure your bucket allows public read if you use this directly,
        // otherwise return the gs:// path or a signed URL.
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

        console.log(`[saveSessionToGCS] Session saved to ${publicUrl}`);

        return {
            success: true,
            url: publicUrl,
        };
    } catch (error: any) {
        console.error("[saveSessionToGCS] Error saving session to GCS:", error);
        return {
            success: false,
            error: error.message || "Failed to save session to GCS",
        };
    }
}

export async function getGCSUploadUrl(contentType: string, extension: string, userId: string, fileId: string): Promise<{ success: boolean; uploadUrl?: string; fileUrl?: string; error?: string }> {
    try {
        const bucket = storage.bucket(BUCKET_NAME);

        // Flat Organization: Generate a signed upload URL into the shared uploads folder
        const filename = `uploads/${userId}_${fileId}.${extension}`;
        const file = bucket.file(filename);

        // Generate a 15-minute signed URL for PUT
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000,
            contentType: contentType,
        });

        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

        return {
            success: true,
            uploadUrl,
            fileUrl: publicUrl
        };
    } catch (error: any) {
        console.error("[getGCSUploadUrl] Error generating signed URL:", error);
        return {
            success: false,
            error: error.message || "Failed to generate signed URL",
        };
    }
}

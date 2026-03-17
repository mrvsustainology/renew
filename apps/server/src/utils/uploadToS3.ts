import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { env } from "../config/env";
import { AppError } from "./AppError";

const s3 = new S3Client({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
});

interface UploadResult {
    url: string;
    key: string;
}

export const uploadToS3 = async (
    buffer: Buffer,
    folder: string,
    filename: string,
    mimeType: string
): Promise<UploadResult> => {
    const key = `${folder}/${Date.now()}-${filename}`;
    console.log(`[S3] Uploading → bucket=${env.S3_BUCKET_NAME} region=${env.AWS_REGION} key=${key} size=${buffer.length}b mime=${mimeType}`);
    try {
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: env.S3_BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
            },
        });

        await upload.done();

        const url = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
        console.log(`[S3] Upload success → ${url}`);

        return { url, key };
    } catch (err: any) {
        console.error(`[S3] Upload FAILED:`, err?.message ?? err);
        console.error(`[S3] Error code:`, err?.Code ?? err?.code);
        throw AppError.internal("Photo upload failed");
    }
};

/**
 * Generate a pre-signed GET URL valid for 1 hour.
 * Accepts either a raw S3 key or a full S3 URL — extracts the key automatically.
 */
export const getPresignedUrl = async (keyOrUrl: string): Promise<string> => {
    // Extract the key from a full S3 URL if needed
    let key = keyOrUrl;
    try {
        const parsed = new URL(keyOrUrl);
        // pathname starts with "/" — strip it
        key = parsed.pathname.replace(/^\//, "");
    } catch {
        // Not a URL — treat as key directly
    }

    const command = new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
};

export const deleteFromS3 = async (key: string): Promise<void> => {
    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: env.S3_BUCKET_NAME,
            Key: key,
        }));
    } catch (err) {
        // Log but don't throw — deletion failure is not critical
        console.error("S3 delete failed:", err);
    }
};
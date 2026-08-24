import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: env.AWS_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3;
}

/**
 * Get a presigned URL for uploading a file to S3.
 * The client uploads directly to S3 using this URL.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const s3 = getS3();
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

/** Get the public URL for a stored object. */
export function getPublicUrl(key: string): string {
  return `${env.S3_PUBLIC_URL}/${key}`;
}

/** Delete an object from S3. */
export async function deleteObject(key: string): Promise<void> {
  const s3 = getS3();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    }),
  );
}

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

let s3Client: S3Client | null = null;

export const BUCKET_COMMITS = process.env.S3_BUCKET_COMMITS || "syncpro-commits";
export const BUCKET_SNAPSHOTS = process.env.S3_BUCKET_SNAPSHOTS || "syncpro-snapshots";

export function getS3Client(): S3Client {
  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT || "http://minio:9000";
    const region = process.env.AWS_REGION || "us-east-1";

    if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
      throw new Error(
        "[SECURITY] S3_ACCESS_KEY and S3_SECRET_KEY environment variables are required."
      );
    }

    s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true, // Crucial for MinIO and self-hosted S3
    });
  }

  return s3Client;
}

export async function ensureBucketExists(bucket: string): Promise<void> {
  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`[S3] Created bucket ${bucket}`);
    } catch (createErr) {
      console.warn(`[S3] Bucket init notice for ${bucket}:`, (createErr as Error).message);
    }
  }
}

export async function putS3Object(
  bucket: string,
  key: string,
  body: Uint8Array | Buffer | string,
  contentType = "application/octet-stream"
): Promise<string> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${bucket}/${key}`;
}

export async function getS3Object(
  bucket: string,
  key: string
): Promise<Uint8Array | null> {
  const client = getS3Client();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) return null;
    const byteArray = await response.Body.transformToByteArray();
    return byteArray;
  } catch (error) {
    console.error(`[S3 Get Error] ${bucket}/${key}:`, (error as Error).message);
    return null;
  }
}

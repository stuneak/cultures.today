import { Client } from "minio";

const MAX_FILE_SIZE =
  parseInt(process.env.MAX_FILE_SIZE_MB || "50") * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string[]> = {
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif",
  ],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/webm"],
  video: ["video/mp4", "video/webm", "video/ogg"],
};

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT?.split(":")[0] || "localhost",
  port: parseInt(process.env.MINIO_ENDPOINT?.split(":")[1] || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "cultures",
  secretKey: process.env.MINIO_SECRET_KEY || "cultures_dev_password",
});

const BUCKET = process.env.MINIO_BUCKET || "cultures";

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${BUCKET}/*`],
        },
      ],
    };
    await minioClient.setBucketPolicy(BUCKET, JSON.stringify(policy));
  }
}

export async function uploadFile(
  file: File,
  category: string,
  cultureSlug: string,
): Promise<{ key: string; url: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  const mediaType = Object.entries(ALLOWED_TYPES).find(([, types]) =>
    types.includes(file.type),
  )?.[0];

  if (!mediaType) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  await ensureBucket();

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const key = `${category}/${cultureSlug}/${filename}`;

  await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": file.type,
  });

  return { key, url: key };
}

export async function deleteFile(key: string): Promise<void> {
  await minioClient.removeObject(BUCKET, key);
}

export async function deleteFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const objects = keys.map((key) => ({ name: key }));
  await minioClient.removeObjects(BUCKET, objects);
}

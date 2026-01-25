export function getMediaUrl(key: string | null): string {
  if (!key) return "";

  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }

  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "localhost:9000";
  const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || "cultures";
  const protocol =
    process.env.NEXT_PUBLIC_MINIO_USE_SSL === "true" ? "https" : "http";

  return `${protocol}://${endpoint}/${bucket}/${key}`;
}

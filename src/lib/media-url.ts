export function getMediaUrl(key: string | null): string {
  if (!key) return "";

  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "localhost:9000";
  const bucket = process.env.NEXT_PUBLIC_MINIO_BUCKET || "cultures";
  const protocol =
    process.env.NEXT_PUBLIC_MINIO_USE_SSL === "true" ? "https" : "http";

  if (process.env.NODE_ENV === "production") {
    return `/${bucket}/${key}`;
  }

  return `${protocol}://${endpoint}/${bucket}/${key}`;
}

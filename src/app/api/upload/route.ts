import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/minio";
import { processVideo, getVideoDuration } from "@/lib/video-processor";
import { processFlag } from "@/lib/image-processor";

const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_VIDEO_DURATION = 5 * 60; // 5 minutes in seconds

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const nationSlug = formData.get("nationSlug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image must be less than 100MB" },
        { status: 400 },
      );
    }

    if (!category || !nationSlug) {
      return NextResponse.json(
        { error: "Category and nationSlug are required" },
        { status: 400 },
      );
    }

    const validCategories = ["flags", "audio", "content"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400 },
      );
    }

    let fileToUpload: File = file;

    // Process videos to 16:9 720p
    if (category === "content" && file.type.startsWith("video/")) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // Check duration first
      try {
        const duration = await getVideoDuration(buffer);
        if (duration > MAX_VIDEO_DURATION) {
          return NextResponse.json(
            { error: "Video must be 5 minutes or less" },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error("Failed to check video duration:", error);
        // Continue with upload even if duration check fails
      }

      // Then process
      try {
        const processedBuffer = await processVideo(buffer, file.name);
        fileToUpload = new File(
          [new Uint8Array(processedBuffer)],
          file.name.replace(/\.\w+$/, ".mp4"),
          { type: "video/mp4" },
        );
      } catch (error) {
        console.error("Video processing failed, uploading original:", error);
        // Fall back to uploading original if processing fails
      }
    }

    // Process flag images to fit 1024x720 box
    if (category === "flags" && file.type.startsWith("image/")) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const processedBuffer = await processFlag(buffer);
        fileToUpload = new File(
          [new Uint8Array(processedBuffer)],
          file.name.replace(/\.\w+$/, ".png"),
          { type: "image/png" },
        );
      } catch (error) {
        console.error("Flag processing failed, uploading original:", error);
        // Fall back to uploading original if processing fails
      }
    }

    const result = await uploadFile(fileToUpload, category, nationSlug);

    return NextResponse.json(
      {
        key: result.key,
        url: result.url,
        filename: fileToUpload.name,
        size: fileToUpload.size,
        type: fileToUpload.type,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/minio";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string | null;
    const nationSlug = formData.get("nationSlug") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    const result = await uploadFile(file, category, nationSlug);

    return NextResponse.json(
      {
        key: result.key,
        url: result.url,
        filename: file.name,
        size: file.size,
        type: file.type,
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

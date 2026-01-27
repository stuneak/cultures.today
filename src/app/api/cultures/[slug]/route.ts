import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const culture = await db.culture.findUnique({
      where: { slug },
      include: {
        languages: {
          include: { phrases: true },
        },
        contents: true,
        submittedBy: {
          select: { id: true, email: true },
        },
      },
    });

    if (!culture) {
      return NextResponse.json({ error: "Culture not found" }, { status: 404 });
    }

    // Only return if approved (public access)
    // Admin routes will have separate access
    if (culture.state !== "approved") {
      return NextResponse.json({ error: "Culture not found" }, { status: 404 });
    }

    return NextResponse.json(culture);
  } catch (error) {
    console.error("GET /api/cultures/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch culture" },
      { status: 500 },
    );
  }
}

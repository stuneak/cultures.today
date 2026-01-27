import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const nation = await db.nation.findUnique({
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

    if (!nation) {
      return NextResponse.json({ error: "Nation not found" }, { status: 404 });
    }

    // Only return if approved (public access)
    // Admin routes will have separate access
    if (nation.state !== "approved") {
      return NextResponse.json({ error: "Nation not found" }, { status: 404 });
    }

    return NextResponse.json(nation);
  } catch (error) {
    console.error("GET /api/nations/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nation" },
      { status: 500 },
    );
  }
}

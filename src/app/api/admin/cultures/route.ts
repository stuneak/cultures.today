import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get("state");

    if (state !== "pending" && state !== "approved") {
      return NextResponse.json(
        { error: "Invalid state. Must be 'pending' or 'approved'" },
        { status: 400 }
      );
    }

    const cultures = await db.culture.findMany({
      where: { state },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        createdAt: true,
        submittedBy: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ cultures });
  } catch (error) {
    console.error("GET /api/admin/cultures error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cultures" },
      { status: 500 }
    );
  }
}

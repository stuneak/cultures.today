import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Find all approved nations at a given point (for overlapping regions)
export async function GET(request: NextRequest) {
  try {
    const lng = request.nextUrl.searchParams.get("lng");
    const lat = request.nextUrl.searchParams.get("lat");

    if (!lng || !lat) {
      return NextResponse.json(
        { error: "lng and lat query parameters are required" },
        { status: 400 },
      );
    }

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    if (isNaN(longitude) || isNaN(latitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 },
      );
    }

    // Use raw SQL for PostGIS spatial query
    const nations = await db.$queryRaw<
      Array<{ id: string; name: string; slug: string; flagUrl: string | null }>
    >`
      SELECT id, name, slug, flag_url as "flagUrl"
      FROM nations
      WHERE state = 'approved'
        AND boundary IS NOT NULL
        AND ST_Contains(boundary, ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326))
      ORDER BY name ASC
    `;

    return NextResponse.json({ nations });
  } catch (error) {
    console.error("GET /api/nations/at-point error:", error);
    return NextResponse.json(
      { error: "Failed to query nations at point" },
      { status: 500 },
    );
  }
}

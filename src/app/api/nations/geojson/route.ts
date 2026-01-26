import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Use raw SQL to get boundary as GeoJSON directly from PostGIS
    const nations = await db.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        flagUrl: string | null;
        boundaryGeojson: string | null;
      }>
    >`
      SELECT
        id,
        name,
        slug,
        flag_url as "flagUrl",
        ST_AsGeoJSON(boundary) as "boundaryGeojson"
      FROM nations
      WHERE state = 'approved'
        AND boundary IS NOT NULL
    `;

    const features = nations
      .map((nation) => {
        try {
          const geometry = nation.boundaryGeojson
            ? JSON.parse(nation.boundaryGeojson)
            : null;

          return {
            type: "Feature",
            id: nation.id,
            properties: {
              id: nation.id,
              name: nation.name,
              slug: nation.slug,
              flagUrl: nation.flagUrl,
            },
            geometry,
          };
        } catch {
          return null;
        }
      })
      .filter((f) => f !== null && f.geometry !== undefined);

    return NextResponse.json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("GET /api/nations/geojson error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GeoJSON" },
      { status: 500 },
    );
  }
}

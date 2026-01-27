import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Use raw SQL to get boundary as GeoJSON directly from PostGIS
    const cultures = await db.$queryRaw<
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
      FROM cultures
      WHERE state = 'approved'
        AND boundary IS NOT NULL
    `;

    const features = cultures
      .map((culture) => {
        try {
          const geometry = culture.boundaryGeojson
            ? JSON.parse(culture.boundaryGeojson)
            : null;

          return {
            type: "Feature",
            id: culture.id,
            properties: {
              id: culture.id,
              name: culture.name,
              slug: culture.slug,
              flagUrl: culture.flagUrl,
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
    console.error("GET /api/cultures/geojson error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GeoJSON" },
      { status: 500 },
    );
  }
}

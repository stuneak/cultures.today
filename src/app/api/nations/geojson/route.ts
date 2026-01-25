import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Only return approved nations for public map
    const nations = await db.nation.findMany({
      where: {
        state: "approved",
        boundaryGeoJson: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        flagUrl: true,
        boundaryGeoJson: true,
      },
    });

    const features = nations
      .map((nation) => {
        try {
          const geoJson = nation.boundaryGeoJson
            ? JSON.parse(nation.boundaryGeoJson)
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
            geometry: geoJson?.geometry,
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

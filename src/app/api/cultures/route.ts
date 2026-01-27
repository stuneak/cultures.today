import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  cultureQuerySchema,
  cultureSubmitSchema,
} from "@/lib/validations/culture";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: Public - returns only approved cultures (for map display)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = cultureQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    // Public API only returns approved cultures
    const where = {
      state: "approved" as const,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
          {
            languages: {
              some: {
                name: { contains: query.search, mode: "insensitive" as const },
              },
            },
          },
        ],
      }),
    };

    const [cultures, total] = await Promise.all([
      db.culture.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          flagUrl: true,
          // boundaryGeoJson removed - use /api/cultures/geojson for boundaries
        },
        orderBy: { name: "asc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.culture.count({ where }),
    ]);

    return NextResponse.json({
      cultures,
      pagination: { total, limit: query.limit, offset: query.offset },
    });
  } catch (error) {
    console.error("GET /api/cultures error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cultures" },
      { status: 500 },
    );
  }
}

// POST: Anyone can submit a new culture (created as pending)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = cultureSubmitSchema.parse(body);

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists
    const existing = await db.culture.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A culture with this name already exists" },
        { status: 409 },
      );
    }

    // Get current user if authenticated (optional)
    const session = await getServerSession(authOptions);

    // Create culture with nested languages and contents in a transaction
    const culture = await db.$transaction(async (tx) => {
      // Create the culture
      const newCulture = await tx.culture.create({
        data: {
          name: data.name,
          description: data.description,
          flagUrl: data.flagUrl,
          slug,
          state: "pending",
          submittedById: session?.user?.id ?? null,
        },
        select: { id: true, name: true, slug: true, state: true },
      });

      // Create languages with phrases
      for (const lang of data.languages) {
        await tx.language.create({
          data: {
            name: lang.name,
            cultureId: newCulture.id,
            phrases: {
              create: lang.phrases.map((phrase) => ({
                text: phrase.text,
                translation: phrase.translation,
                audioUrl: phrase.audioUrl,
              })),
            },
          },
        });
      }

      // Create contents
      await tx.content.createMany({
        data: data.contents.map((content) => ({
          title: content.title,
          contentType: content.contentType,
          contentUrl: content.contentUrl,
          cultureId: newCulture.id,
        })),
      });

      return newCulture;
    });

    // If boundary GeoJSON was provided, set the PostGIS geometry column
    if (data.boundaryGeoJson) {
      // Extract just the geometry from the Feature
      const feature = JSON.parse(data.boundaryGeoJson);
      const geometryJson = JSON.stringify(feature.geometry);

      await db.$executeRaw`
        UPDATE cultures
        SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326)
        WHERE id = ${culture.id}
      `;
    }

    return NextResponse.json(culture, { status: 201 });
  } catch (error) {
    console.error("POST /api/cultures error:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Culture with this name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to submit culture" },
      { status: 500 },
    );
  }
}

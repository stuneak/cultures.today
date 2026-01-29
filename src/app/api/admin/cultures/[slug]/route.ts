import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteFiles } from "@/lib/minio";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authResult = await checkAdminAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

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

    // Fetch boundary as GeoJSON using raw SQL
    const boundaryResult = await db.$queryRaw<
      Array<{ boundaryGeoJson: string | null }>
    >`
      SELECT ST_AsGeoJSON(boundary) as "boundaryGeoJson"
      FROM cultures
      WHERE id = ${culture.id}
    `;

    const boundaryGeoJson = boundaryResult[0]?.boundaryGeoJson || null;

    return NextResponse.json({
      ...culture,
      boundaryGeoJson,
    });
  } catch (error) {
    console.error("GET /api/admin/cultures/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch culture" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authResult = await checkAdminAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { slug } = await params;
    const body = await request.json();

    const culture = await db.culture.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!culture) {
      return NextResponse.json({ error: "Culture not found" }, { status: 404 });
    }

    // Update culture with transaction for nested data
    const updated = await db.$transaction(async (tx) => {
      // Update basic fields
      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.flagUrl !== undefined) updateData.flagUrl = body.flagUrl;
      if (body.state !== undefined) updateData.state = body.state;

      const updatedCulture = await tx.culture.update({
        where: { slug },
        data: updateData,
      });

      // Handle languages replacement if provided
      if (body.languages !== undefined) {
        // Delete existing languages (cascades to phrases)
        await tx.language.deleteMany({
          where: { cultureId: culture.id },
        });

        // Create new languages with phrases
        for (const lang of body.languages) {
          await tx.language.create({
            data: {
              name: lang.name,
              cultureId: culture.id,
              phrases: {
                create: lang.phrases.map((phrase: { text: string; translation: string; audioUrl?: string }) => ({
                  text: phrase.text,
                  translation: phrase.translation,
                  audioUrl: phrase.audioUrl,
                })),
              },
            },
          });
        }
      }

      // Handle contents replacement if provided
      if (body.contents !== undefined) {
        await tx.content.deleteMany({
          where: { cultureId: culture.id },
        });

        await tx.content.createMany({
          data: body.contents.map((content: { title: string; contentType: string; contentUrl?: string }) => ({
            title: content.title,
            contentType: content.contentType,
            contentUrl: content.contentUrl,
            cultureId: culture.id,
          })),
        });
      }

      // Handle boundary GeoJSON if provided
      if (body.boundaryGeoJson !== undefined) {
        if (body.boundaryGeoJson === null) {
          await tx.$executeRaw`
            UPDATE cultures SET boundary = NULL WHERE id = ${culture.id}
          `;
        } else {
          const feature = JSON.parse(body.boundaryGeoJson);
          const geometryJson = JSON.stringify(feature.geometry);
          await tx.$executeRaw`
            UPDATE cultures
            SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326)
            WHERE id = ${culture.id}
          `;
        }
      }

      return updatedCulture;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/admin/cultures/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to update culture" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authResult = await checkAdminAuth();
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { slug } = await params;

    // Fetch culture with all related data to collect file paths
    const culture = await db.culture.findUnique({
      where: { slug },
      include: {
        languages: {
          include: { phrases: true },
        },
        contents: true,
      },
    });

    if (!culture) {
      return NextResponse.json({ error: "Culture not found" }, { status: 404 });
    }

    // Collect all Minio file paths to delete
    const filesToDelete: string[] = [];

    // Flag URL
    if (culture.flagUrl) {
      filesToDelete.push(culture.flagUrl);
    }

    // Audio URLs from phrases
    for (const language of culture.languages) {
      for (const phrase of language.phrases) {
        if (phrase.audioUrl) {
          filesToDelete.push(phrase.audioUrl);
        }
      }
    }

    // Content URLs (only UPLOAD type, not YouTube)
    for (const content of culture.contents) {
      if (content.contentType === "UPLOAD" && content.contentUrl) {
        filesToDelete.push(content.contentUrl);
      }
    }

    // Delete files from Minio
    if (filesToDelete.length > 0) {
      await deleteFiles(filesToDelete);
    }

    // Delete culture from database (cascades to languages, phrases, contents)
    await db.culture.delete({
      where: { slug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/cultures/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to delete culture" },
      { status: 500 }
    );
  }
}

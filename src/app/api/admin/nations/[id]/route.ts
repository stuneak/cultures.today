import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { nationUpdateSchema } from "@/lib/validations/nation";

// GET: Admin - get full nation details (including pending)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const nation = await db.nation.findUnique({
      where: { id },
      include: {
        languages: { include: { phrases: true } },
        contents: true,
        submittedBy: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!nation) {
      return NextResponse.json({ error: "Nation not found" }, { status: 404 });
    }

    return NextResponse.json(nation);
  } catch (error) {
    console.error("GET /api/admin/nations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nation" },
      { status: 500 },
    );
  }
}

// PATCH: Admin - update nation (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = nationUpdateSchema.parse(body);

    // Separate boundaryGeoJson from other data (it's not a Prisma field anymore)
    const { boundaryGeoJson, ...prismaData } = data;

    const nation = await db.nation.update({
      where: { id },
      data: prismaData,
      select: { id: true, name: true, slug: true, state: true },
    });

    // If boundary GeoJSON was updated, sync the PostGIS geometry column
    if (boundaryGeoJson) {
      await db.$executeRaw`
        UPDATE nations
        SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(${boundaryGeoJson}::json->'geometry'), 4326)
        WHERE id = ${id}
      `;
    }

    return NextResponse.json(nation);
  } catch (error) {
    console.error("PATCH /api/admin/nations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update nation" },
      { status: 500 },
    );
  }
}

// DELETE: Admin - delete nation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    await db.nation.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/admin/nations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete nation" },
      { status: 500 },
    );
  }
}

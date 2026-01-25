import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  nationQuerySchema,
  nationSubmitSchema,
} from "@/lib/validations/nation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: Public - returns only approved nations (for map display)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = nationQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    // Public API only returns approved nations
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

    const [nations, total] = await Promise.all([
      db.nation.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          flagUrl: true,
          boundaryGeoJson: true,
        },
        orderBy: { name: "asc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.nation.count({ where }),
    ]);

    return NextResponse.json({
      nations,
      pagination: { total, limit: query.limit, offset: query.offset },
    });
  } catch (error) {
    console.error("GET /api/nations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nations" },
      { status: 500 },
    );
  }
}

// POST: Anyone can submit a new nation (created as pending)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = nationSubmitSchema.parse(body);

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists
    const existing = await db.nation.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A nation with this name already exists" },
        { status: 409 },
      );
    }

    // Get current user if authenticated (optional)
    const session = await getServerSession(authOptions);

    const nation = await db.nation.create({
      data: {
        ...data,
        slug,
        state: "pending", // Always starts as pending
        submittedById: session?.user?.id ?? null,
      },
      select: { id: true, name: true, slug: true, state: true },
    });

    return NextResponse.json(nation, { status: 201 });
  } catch (error) {
    console.error("POST /api/nations error:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Nation with this name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to submit nation" },
      { status: 500 },
    );
  }
}

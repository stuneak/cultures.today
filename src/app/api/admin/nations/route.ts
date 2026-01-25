import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { nationQuerySchema } from "@/lib/validations/nation";

// GET: Admin - list all nations with optional state filter
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = nationQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      state: searchParams.get("state") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    const where = {
      ...(query.state && { state: query.state }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" as const } },
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
          state: true,
          description: true,
          createdAt: true,
          submittedBy: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
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
    console.error("GET /api/admin/nations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nations" },
      { status: 500 },
    );
  }
}

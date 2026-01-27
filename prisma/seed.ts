import { PrismaClient, ContentType, CultureState } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to update PostGIS boundary from GeoJSON
// async function updateBoundaryGeometry(cultureId: string, geoJson: object) {
//   const geometry = (geoJson as { geometry: object }).geometry;
//   await prisma.$executeRawUnsafe(
//     `
//     UPDATE cultures
//     SET boundary = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
//     WHERE id = $2
//   `,
//     JSON.stringify(geometry),
//     cultureId,
//   );
// }

async function main() {}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

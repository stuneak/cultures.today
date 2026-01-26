import { PrismaClient, ContentType, ContentCategory, NationState } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to update PostGIS boundary from GeoJSON
async function updateBoundaryGeometry(nationId: string, geoJson: object) {
  const geometry = (geoJson as { geometry: object }).geometry;
  await prisma.$executeRawUnsafe(`
    UPDATE nations
    SET boundary = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
    WHERE id = $2
  `, JSON.stringify(geometry), nationId);
}

async function main() {
  // Clear existing data
  await prisma.phrase.deleteMany();
  await prisma.language.deleteMany();
  await prisma.content.deleteMany();
  await prisma.nation.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@cultures.com",
      firstName: "Admin",
      lastName: "User",
      isAdmin: true,
    },
  });

  // Create Japan (approved)
  const japanGeoJson = {
    type: "Feature",
    properties: { name: "Japan" },
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [129.408463, 31.029579],
            [131.220475, 31.418238],
            [131.778344, 33.107691],
            [135.792984, 33.464923],
            [136.527402, 35.772532],
            [140.253279, 35.658073],
            [141.224969, 40.232738],
            [141.406618, 41.588834],
            [140.113556, 45.138722],
            [136.789418, 41.500206],
            [129.408463, 31.029579],
          ],
        ],
      ],
    },
  };
  const japan = await prisma.nation.create({
    data: {
      name: "Japan",
      slug: "japan",
      state: NationState.approved,
      description:
        "An island country in East Asia, known for its unique blend of ancient traditions and cutting-edge technology.",
      flagUrl: "flags/japan.svg",
      boundaryGeoJson: JSON.stringify(japanGeoJson),
      languages: {
        create: {
          name: "Japanese",
          description:
            "Japanese is an East Asian language spoken by about 128 million people, primarily in Japan. It uses three writing systems: Hiragana, Katakana, and Kanji.",
          phrases: {
            create: [
              {
                text: "こんにちは",
                translation: "Hello",
                audioUrl: "audio/japan/hello.mp3",
              },
              {
                text: "ありがとうございます",
                translation: "Thank you",
                audioUrl: "audio/japan/thankyou.mp3",
              },
              {
                text: "さようなら",
                translation: "Goodbye",
                audioUrl: "audio/japan/goodbye.mp3",
              },
            ],
          },
        },
      },
      contents: {
        create: [
          {
            title: "Sushi",
            contentType: ContentType.IMAGE_UPLOAD,
            contentUrl: "content/japan/sushi.jpg",
            category: ContentCategory.FOOD,
          },
          {
            title: "Ramen",
            contentType: ContentType.IMAGE_UPLOAD,
            contentUrl: "content/japan/ramen.jpg",
            category: ContentCategory.FOOD,
          },
          {
            title: "Traditional Tea Ceremony",
            contentType: ContentType.VIDEO_YOUTUBE,
            contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            category: ContentCategory.OTHER,
          },
        ],
      },
    },
  });

  // Update Japan boundary geometry
  await updateBoundaryGeometry(japan.id, japanGeoJson);

  // Create Brazil (approved)
  const brazilGeoJson = {
    type: "Feature",
    properties: { name: "Brazil" },
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [-57.625133, -30.216295],
            [-53.373662, -33.768378],
            [-48.549541, -28.674115],
            [-40.696295, -22.356722],
            [-34.846291, -7.398605],
            [-43.413594, 2.153],
            [-51.657797, 4.156232],
            [-60.733574, 5.200277],
            [-69.52968, -0.549992],
            [-73.219711, -6.644789],
            [-72.352891, -13.535079],
            [-67.649685, -22.890352],
            [-57.625133, -30.216295],
          ],
        ],
      ],
    },
  };
  const brazil = await prisma.nation.create({
    data: {
      name: "Brazil",
      slug: "brazil",
      state: NationState.approved,
      description:
        "The largest country in South America, known for its Amazon rainforest and football.",
      flagUrl: "flags/brazil.svg",
      boundaryGeoJson: JSON.stringify(brazilGeoJson),
      languages: {
        create: {
          name: "Portuguese",
          description:
            "Brazilian Portuguese spoken by most of the 214 million inhabitants.",
          phrases: {
            create: [
              { text: "Olá", translation: "Hello", audioUrl: "audio/brazil/hello.mp3" },
              { text: "Obrigado/Obrigada", translation: "Thank you (male/female)", audioUrl: "audio/brazil/thankyou.mp3" },
              { text: "Tchau", translation: "Goodbye", audioUrl: "audio/brazil/goodbye.mp3" },
            ],
          },
        },
      },
      contents: {
        create: [
          {
            title: "Feijoada",
            contentType: ContentType.IMAGE_UPLOAD,
            contentUrl: "content/brazil/feijoada.jpg",
            category: ContentCategory.FOOD,
          },
        ],
      },
    },
  });

  // Update Brazil boundary geometry
  await updateBoundaryGeometry(brazil.id, brazilGeoJson);

  // Create a pending nation for testing admin moderation
  const testPending = await prisma.nation.create({
    data: {
      name: "Test Pending Nation",
      slug: "test-pending",
      state: NationState.pending,
      description: "A test nation pending approval.",
    },
  });

  console.log("Seeded:", {
    adminUser: adminUser.id,
    japan: japan.id,
    brazil: brazil.id,
    testPending: testPending.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

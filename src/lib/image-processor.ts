import sharp from "sharp";

export async function processFlag(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(1024, 720, {
      fit: "inside", // Fit inside box, never crop
      withoutEnlargement: true, // Don't upscale small images
    })
    .png() // Output as PNG to preserve transparency
    .toBuffer();
}

import { exec } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function processVideo(
  inputBuffer: Buffer,
  inputFilename: string
): Promise<Buffer> {
  const tempDir = join(tmpdir(), "cultures-video-processing");
  await mkdir(tempDir, { recursive: true });

  const inputExt = inputFilename.split(".").pop() || "mp4";
  const tempInput = join(tempDir, `input-${randomUUID()}.${inputExt}`);
  const tempOutput = join(tempDir, `output-${randomUUID()}.mp4`);

  try {
    await writeFile(tempInput, inputBuffer);

    // Convert to 16:9 720p, padding if necessary to maintain aspect ratio
    const ffmpegCmd = `/opt/homebrew/bin/ffmpeg -i "${tempInput}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -y "${tempOutput}"`;

    await execAsync(ffmpegCmd);

    const outputBuffer = await readFile(tempOutput);
    return outputBuffer;
  } finally {
    // Cleanup temp files
    await unlink(tempInput).catch(() => {});
    await unlink(tempOutput).catch(() => {});
  }
}

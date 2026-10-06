import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceLogo = path.resolve(__dirname, "../../Client/src/assets/CLIENTRA.png");
const outputDir = path.resolve(__dirname, "../../Extension/icons");

if (!fs.existsSync(sourceLogo)) {
  console.error("Source logo not found at:", sourceLogo);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generate() {
  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const targetPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(sourceLogo)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(targetPath);
    console.log(`Generated ${targetPath} (${size}x${size})`);
  }
}

generate().catch(console.error);

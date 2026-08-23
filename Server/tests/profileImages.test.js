import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  optimizeAvatarDataUrl,
  optimizeCoverPhotoDataUrl,
  parseAvatarDataUrl,
} from "../utils/avatar.js";

const asDataUrl = (mimeType, buffer) =>
  `data:${mimeType};base64,${buffer.toString("base64")}`;

test("avatar and cover uploads are decoded and stored as optimized WebP images", async () => {
  const source = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: "#c72fb2" },
  }).png().toBuffer();

  const avatar = parseAvatarDataUrl(await optimizeAvatarDataUrl(asDataUrl("image/png", source)));
  const cover = parseAvatarDataUrl(await optimizeCoverPhotoDataUrl(asDataUrl("image/png", source)));
  const avatarMetadata = await sharp(avatar.buffer).metadata();
  const coverMetadata = await sharp(cover.buffer).metadata();

  assert.equal(avatar.contentType, "image/webp");
  assert.equal(avatarMetadata.width, 512);
  assert.equal(avatarMetadata.height, 512);
  assert.equal(cover.contentType, "image/webp");
  assert.ok(coverMetadata.width <= 1920);
  assert.ok(coverMetadata.height <= 720);
});

test("profile image uploads reject invalid image bytes", async () => {
  await assert.rejects(
    optimizeAvatarDataUrl(asDataUrl("image/png", Buffer.from("not an image"))),
    (error) => error.status === 400 && /not a valid image/.test(error.message)
  );

  await assert.rejects(
    optimizeCoverPhotoDataUrl("data:image/svg+xml;base64,PHN2Zy8+"),
    (error) => error.status === 400 && /PNG, JPEG, WebP, or GIF/.test(error.message)
  );
});

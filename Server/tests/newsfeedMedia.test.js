import assert from "node:assert/strict";
import test from "node:test";
import { validateMediaInput } from "../routes/newsfeed.js";

const dataUrl = (mimeType, bytes) =>
  `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;

test("newsfeed media accepts raster bytes matching the declared MIME", () => {
  const jpeg = validateMediaInput({
    type: "image",
    name: "preview.jpg",
    url: dataUrl("image/jpeg", [0xff, 0xd8, 0xff, 0xdb, 0x00]),
  });

  assert.equal(jpeg.error, undefined);
  assert.equal(jpeg.media.type, "image");
});

test("newsfeed media rejects active content disguised as a safe image", () => {
  const disguised = validateMediaInput({
    type: "image",
    name: "preview.png",
    url: dataUrl("image/png", Buffer.from("<svg onload=alert(1)></svg>")),
  });

  assert.match(disguised.error, /does not match/i);
});

test("newsfeed media rejects video bytes that do not match the declared container", () => {
  const disguised = validateMediaInput({
    type: "video",
    name: "preview.mp4",
    url: dataUrl("video/mp4", Buffer.from("not-an-mp4")),
  });

  assert.match(disguised.error, /does not match/i);
});

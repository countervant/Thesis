import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  assertDistinctReviewFile,
  buildCloudinaryDownloadUrl,
  createProtectedImageReview,
  getTaskFinalOutputForViewer,
  isPaymentProtectedTask,
  normalizeHttpOutputLink,
  parseOutputFile,
} from "../routes/tasks.js";

const asDataUrl = (mimeType, value) => {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
};

const expectValidationError = (action, messagePattern, status = 400) => {
  assert.throws(action, (error) => {
    assert.equal(error.status, status);
    assert.match(error.message, messagePattern);
    return true;
  });
};

test("Cloudinary video downloads are forced as attachments", () => {
  const url = "https://res.cloudinary.com/demo/video/upload/sample.mp4?token=abc";
  const downloadable = buildCloudinaryDownloadUrl(url, "sample-video.mp4");

  // fl_attachment must be a path transformation, not a query string parameter.
  // Cloudinary ignores unknown query parameters for delivery transformations.
  // The filename stem (WITHOUT extension) must be used in fl_attachment because
  // Cloudinary treats the portion after the final dot as a format transformation
  // parameter — passing "file.mp4" causes 400 "Invalid flag in transformation: mp4".
  // Cloudinary appends the correct extension from the delivery URL automatically.
  assert.match(downloadable, /\/upload\/fl_attachment:sample-video\//);
  // The extension must NOT appear inside the fl_attachment flag
  assert.doesNotMatch(downloadable, /fl_attachment:sample-video\.mp4/);
  // Original query parameters must be preserved
  assert.match(downloadable, /token=abc/);
  // fl_attachment should NOT appear as a query param
  assert.doesNotMatch(downloadable, /fl_attachment=true/);
});

test("output links accept only absolute HTTP and HTTPS URLs", () => {
  assert.equal(
    normalizeHttpOutputLink(" https://files.example.com/output?id=42 "),
    "https://files.example.com/output?id=42"
  );
  assert.equal(normalizeHttpOutputLink("http://localhost:8080/file"), "http://localhost:8080/file");

  for (const unsafeLink of [
    "javascript:alert(1)",
    "data:text/html;base64,PGgxPkJvb208L2gxPg==",
    "ftp://files.example.com/output",
    "//files.example.com/output",
    "files.example.com/output",
    "not a URL",
    "",
  ]) {
    assert.equal(normalizeHttpOutputLink(unsafeLink), "", unsafeLink);
  }
});

test("allowed uploads use the declared safe MIME and a server-selected extension", () => {
  const parsed = parseOutputFile({
    fileName: "project-output.html",
    dataUrl: asDataUrl("text/plain", "client-safe output"),
  });

  assert.equal(parsed.mimeType, "text/plain");
  assert.equal(parsed.extension, ".txt");
  assert.equal(parsed.fileName, "project-output.txt");
  assert.equal(parsed.buffer.toString(), "client-safe output");
});

test("active and unsupported upload MIME types are rejected", () => {
  expectValidationError(
    () => parseOutputFile({ fileName: "page.html", dataUrl: asDataUrl("text/html", "<h1>x</h1>") }),
    /HTML, SVG, XML, JavaScript, and executable files/
  );
  expectValidationError(
    () => parseOutputFile({ fileName: "vector.svg", dataUrl: asDataUrl("image/svg+xml", "<svg/>") }),
    /HTML, SVG, XML, JavaScript, and executable files/
  );
  expectValidationError(
    () => parseOutputFile({ fileName: "code.js", dataUrl: asDataUrl("application/javascript", "alert(1)") }),
    /HTML, SVG, XML, JavaScript, and executable files/
  );
  expectValidationError(
    () => parseOutputFile({ fileName: "blob.bin", dataUrl: asDataUrl("application/octet-stream", "data") }),
    /file type is not supported/
  );
});

test("upload base64 must be strict and canonical", () => {
  expectValidationError(
    () => parseOutputFile({ fileName: "bad.txt", dataUrl: "data:text/plain;base64,SGVsbG8*" }),
    /valid base64-encoded data URL/
  );
  expectValidationError(
    () => parseOutputFile({ fileName: "bad.txt", dataUrl: "data:text/plain;base64,SGVsbG8" }),
    /not valid base64/
  );
  expectValidationError(
    () => parseOutputFile({ fileName: "bad.txt", dataUrl: "data:text/plain;base64,AB==" }),
    /not valid base64/
  );
});

test("uploads over 10MB are rejected before storage", () => {
  const oversizedPayload = Buffer.alloc(10 * 1024 * 1024 + 1, 0x61).toString("base64");

  expectValidationError(
    () => parseOutputFile({
      fileName: "too-large.txt",
      dataUrl: `data:text/plain;base64,${oversizedPayload}`,
    }),
    /10MB or less/,
    413
  );
});

test("raster uploads must match their declared binary signature", () => {
  expectValidationError(
    () => parseOutputFile({
      fileName: "fake.png",
      dataUrl: asDataUrl("image/png", "<html>not an image</html>"),
    }),
    /does not match its declared file type/
  );

  const onePixelPng =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const parsed = parseOutputFile({
    fileName: "pixel.png",
    dataUrl: `data:image/png;base64,${onePixelPng}`,
  });

  assert.equal(parsed.mimeType, "image/png");
  assert.equal(parsed.extension, ".png");
});

test("active or executable content is rejected even under an allowed MIME", () => {
  expectValidationError(
    () => parseOutputFile({
      fileName: "disguised.txt",
      dataUrl: asDataUrl("text/plain", "  <!doctype html><html></html>"),
    }),
    /Active or executable file content/
  );
  expectValidationError(
    () => parseOutputFile({
      fileName: "disguised.txt",
      dataUrl: asDataUrl("text/plain", Buffer.from([0x4d, 0x5a, 0x90, 0x00])),
    }),
    /Active or executable file content/
  );
});

test("image originals require raster review-copy MIME types", () => {
  expectValidationError(
    () => parseOutputFile(
      { fileName: "review.pdf", dataUrl: asDataUrl("application/pdf", "%PDF-1.4\n") },
      { rasterImageOnly: true }
    ),
    /Image review copies must be/
  );
});

test("protected review copies must differ from their originals", () => {
  const original = parseOutputFile({
    fileName: "original.txt",
    dataUrl: asDataUrl("text/plain", "same bytes"),
  });
  const identicalReview = parseOutputFile({
    fileName: "review.txt",
    dataUrl: asDataUrl("text/plain", "same bytes"),
  });
  const distinctReview = parseOutputFile({
    fileName: "review.txt",
    dataUrl: asDataUrl("text/plain", "watermarked review bytes"),
  });

  expectValidationError(
    () => assertDistinctReviewFile(original, identicalReview),
    /must be different from the original/
  );
  assert.doesNotThrow(() => assertDistinctReviewFile(original, distinctReview));
});

test("protected raster previews are generated and watermarked on the server", async () => {
  const originalBuffer = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#c72fb2" },
  }).jpeg().toBuffer();
  const original = parseOutputFile({
    fileName: "design.jpg",
    dataUrl: asDataUrl("image/jpeg", originalBuffer),
  });
  const review = await createProtectedImageReview(original);

  assert.equal(review.mimeType, "image/jpeg");
  assert.match(review.fileName, /protected-review\.jpg$/);
  assert.equal(review.buffer.equals(original.buffer), false);
});

test("client task responses hide originals and unpaid output links", () => {
  const task = {
    amount: 1000,
    paid: 250,
    finalOutput: {
      link: "https://files.example.com/original",
      originalStoredName: "private-original.pdf",
      submittedAt: new Date("2026-08-13T00:00:00.000Z"),
    },
  };

  assert.equal(isPaymentProtectedTask(task), true);
  assert.deepEqual(getTaskFinalOutputForViewer(task, { role: "client" }), {
    link: "",
    linkProtected: true,
    fileUrl: undefined,
    originalStoredName: undefined,
    previewStoredName: undefined,
    submittedAt: task.finalOutput.submittedAt,
  });
  assert.equal(
    getTaskFinalOutputForViewer(task, { role: "admin" }).link,
    task.finalOutput.link
  );

  const paidTask = { ...task, paid: 1000 };
  assert.equal(isPaymentProtectedTask(paidTask), false);
  assert.equal(
    getTaskFinalOutputForViewer(paidTask, { role: "client" }).link,
    task.finalOutput.link
  );
});

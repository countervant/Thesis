// Compatibility entry point for hosting services configured with `node index.js`.
// The application itself lives in server.js.
import("./server.js").catch((error) => {
  console.error("[startup] Unable to load server.js:", error);
  process.exit(1);
});

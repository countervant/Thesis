// Compatibility entry point for hosting services configured with `node index.js`.
// The application itself lives in Server/server.js.
import("./Server/server.js").catch((error) => {
  console.error("[startup] Unable to load Server/server.js:", error);
  process.exit(1);
});

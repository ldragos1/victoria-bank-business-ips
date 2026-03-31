import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

declare const __filename: string | undefined;

/**
 * Directory of the compiled module (`dist/` when installed from npm).
 * ESM: `import.meta.url`. CJS: `__filename` (Node module wrapper).
 */
function getModuleDir(): string {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  if (typeof __filename !== "undefined") {
    return dirname(__filename);
  }
  throw new Error(
    "victoriabank-mia-integration: cannot resolve module path for VBCA.crt"
  );
}

const distDir = getModuleDir();

/**
 * Absolute filesystem path to the bundled Victoria Bank public certificate
 * **`VBCA.crt`** — use to verify JWT signatures on inbound **`POST /api/signals`**
 * webhooks (body is a JSON string containing the JWT).
 *
 * Resolved relative to this package’s compiled output (`dist/`), so at runtime it
 * points to `…/victoriabank-mia-integration/docs/VBCA.crt` when installed from npm.
 */
export const VICTORIA_BANK_SIGNAL_PUBLIC_CERT_PATH = join(
  distDir,
  "..",
  "docs",
  "VBCA.crt"
);

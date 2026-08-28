// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const isVercel = process.env.VERCEL === "1";
const BUILD_ID = String(Date.now());

// Emit a public/version.json so the client can poll for updates and bust caches
const versionPlugin = {
  name: "lovable-version-stamp",
  buildStart() {
    try {
      const dir = resolve(process.cwd(), "public");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        resolve(dir, "version.json"),
        JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() }),
      );
    } catch (e) {
      console.warn("[version-stamp] failed:", e);
    }
  },
};

export default defineConfig({
  tanstackStart: {
    server: { entry: isVercel ? undefined : "server" },
  },
  vite: {
    define: {
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
  },
  plugins: [
    versionPlugin,
    isVercel ? nitro({ preset: "vercel" }) : undefined,
  ].filter(Boolean),
});

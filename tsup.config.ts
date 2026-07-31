import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],      // Entry point — starts bundling from here
  format: ["esm", "cjs"],        // Outputs both ES Module & CommonJS builds
  target: "esnext",              // Compile to modern JS (no downgrading)
  outDir: "dist",                // Output folder
  clean: true,                   // Wipe dist/ before each build
  bundle: true,                  // Bundle all imports into one file
  splitting: false,              // No code-splitting (one output file)
  sourcemap: true,               // Generate .map files for debugging
  banner: {
    js: `
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
    `,
  },
});
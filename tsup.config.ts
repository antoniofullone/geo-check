import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "data/ai-bots": "src/data/ai-bots.ts"
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node18",
    outDir: "dist"
  },
  {
    entry: {
      cli: "src/cli.ts"
    },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    target: "node18",
    outDir: "dist"
  }
]);

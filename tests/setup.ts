// Node 18 does not expose a global File in all environments.
// Some transitive deps (e.g., undici via cheerio) expect it.
if (typeof globalThis.File === "undefined") {
  class PolyfillFile extends Blob {
    readonly name: string;
    readonly lastModified: number;

    constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
      super(bits, options);
      this.name = name;
      this.lastModified = options?.lastModified ?? Date.now();
    }
  }

  // Assign as a runtime global for libraries that expect File.
  globalThis.File = PolyfillFile as unknown as typeof File;
}

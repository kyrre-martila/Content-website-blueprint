import { resolveMediaStorageProvider } from "../../src/modules/content/media-storage-provider.config";

describe("resolveMediaStorageProvider", () => {
  it("defaults to local when no provider is configured", () => {
    expect(resolveMediaStorageProvider({})).toBe("local");
  });

  it("accepts local provider explicitly", () => {
    expect(resolveMediaStorageProvider({ MEDIA_STORAGE_PROVIDER: "local" })).toBe(
      "local",
    );
  });

  it("throws for extension-only providers", () => {
    expect(() =>
      resolveMediaStorageProvider({ MEDIA_STORAGE_PROVIDER: "supabase" }),
    ).toThrow('Unsupported MEDIA_STORAGE_PROVIDER "supabase"');
  });
});

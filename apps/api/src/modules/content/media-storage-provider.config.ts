export type SupportedMediaStorageProvider = "local";

type Env = Record<string, string | undefined>;

export function resolveMediaStorageProvider(
  env: Env = process.env,
): SupportedMediaStorageProvider {
  const configured = env.MEDIA_STORAGE_PROVIDER?.trim().toLowerCase();

  if (!configured) {
    return "local";
  }

  if (configured === "local") {
    return configured;
  }

  throw new Error(
    `Unsupported MEDIA_STORAGE_PROVIDER "${configured}". This blueprint currently supports only "local". Providers "s3", "r2", and "supabase" are extension points and must be implemented before use.`,
  );
}

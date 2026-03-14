export const IMPLEMENTED_MEDIA_STORAGE_PROVIDERS = ["local"] as const;
export const EXTENSION_ONLY_MEDIA_STORAGE_PROVIDERS = [
  "s3",
  "r2",
  "supabase",
] as const;

export type SupportedMediaStorageProvider =
  (typeof IMPLEMENTED_MEDIA_STORAGE_PROVIDERS)[number];

type Env = Record<string, string | undefined>;

function unsupportedProviderErrorMessage(configured: string): string {
  return `Unsupported MEDIA_STORAGE_PROVIDER "${configured}". This blueprint currently supports only "local". Providers "s3", "r2", and "supabase" are extension points and must be implemented before use.`;
}

export function resolveMediaStorageProvider(
  env: Env = process.env,
): SupportedMediaStorageProvider {
  const configured = env.MEDIA_STORAGE_PROVIDER?.trim().toLowerCase();

  if (!configured) {
    return "local";
  }

  if (
    IMPLEMENTED_MEDIA_STORAGE_PROVIDERS.includes(
      configured as SupportedMediaStorageProvider,
    )
  ) {
    return configured as SupportedMediaStorageProvider;
  }

  throw new Error(unsupportedProviderErrorMessage(configured));
}

export function assertMediaStorageProviderSupported(env: Env = process.env): void {
  const requestedProvider = env.MEDIA_STORAGE_PROVIDER?.trim().toLowerCase();

  if (!requestedProvider) {
    return;
  }

  if (
    IMPLEMENTED_MEDIA_STORAGE_PROVIDERS.includes(
      requestedProvider as SupportedMediaStorageProvider,
    )
  ) {
    return;
  }

  throw new Error(unsupportedProviderErrorMessage(requestedProvider));
}

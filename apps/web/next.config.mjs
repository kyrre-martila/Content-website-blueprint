function normalizeEnvironmentValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function resolveDeploymentEnvironment(env) {
  return (
    normalizeEnvironmentValue(env.DEPLOY_ENV) ||
    normalizeEnvironmentValue(env.APP_ENV) ||
    normalizeEnvironmentValue(env.NODE_ENV) ||
    "development"
  );
}

function assertValidPublicRuntimeConfig(env) {
  const deploymentEnv = resolveDeploymentEnvironment(env);
  const isHardened = deploymentEnv === "production" || deploymentEnv === "staging";

  const apiUrl = env.NEXT_PUBLIC_API_URL?.trim();
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  const apiBasePath = env.NEXT_PUBLIC_API_BASE_PATH?.trim() || "/api/v1";

  if (!apiBasePath.startsWith("/")) {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_BASE_PATH="${apiBasePath}". It must start with '/'.`,
    );
  }

  if (!isHardened) {
    return;
  }

  const missing = [];
  if (!apiUrl) missing.push("NEXT_PUBLIC_API_URL");
  if (!siteUrl) missing.push("NEXT_PUBLIC_SITE_URL");

  if (missing.length > 0) {
    throw new Error(
      `Missing required web runtime environment variables for ${deploymentEnv}: ${missing.join(", ")}. Set explicit public URLs to avoid deploy-only runtime failures.`,
    );
  }

  let parsedApi;
  let parsedSite;
  try {
    parsedApi = new URL(apiUrl);
    parsedSite = new URL(siteUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL must be absolute URLs including protocol (https://...).",
    );
  }

  if (!["http:", "https:"].includes(parsedApi.protocol)) {
    throw new Error(`NEXT_PUBLIC_API_URL must use http/https. Received: ${parsedApi.protocol}`);
  }

  if (!["http:", "https:"].includes(parsedSite.protocol)) {
    throw new Error(`NEXT_PUBLIC_SITE_URL must use http/https. Received: ${parsedSite.protocol}`);
  }

  if (parsedApi.pathname && parsedApi.pathname !== "/") {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be an origin without a path. Configure path versioning with NEXT_PUBLIC_API_BASE_PATH (for example /api/v1).",
    );
  }
}

assertValidPublicRuntimeConfig(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
};
export default nextConfig;

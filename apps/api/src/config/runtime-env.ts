export type Env = Record<string, string | undefined>;

const HARDENED_ENVIRONMENTS = new Set(["production", "staging"]);

function normalizeEnvironmentValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function resolveDeploymentEnvironment(env: Env = process.env): string {
  return (
    normalizeEnvironmentValue(env.DEPLOY_ENV) ||
    normalizeEnvironmentValue(env.APP_ENV) ||
    normalizeEnvironmentValue(env.NODE_ENV) ||
    "development"
  );
}

export function isHardenedEnvironment(env: Env = process.env): boolean {
  return HARDENED_ENVIRONMENTS.has(resolveDeploymentEnvironment(env));
}

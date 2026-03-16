import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { API_PREFIX } from "../config/api-prefix";

const OPENAPI_NOISE_KEYS = new Set([
  "x-generated-at",
  "x-generator",
  "x-generated",
]);

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !OPENAPI_NOISE_KEYS.has(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, childValue]) => [key, sortObjectKeys(childValue)]);

    return Object.fromEntries(entries);
  }

  return value;
}

export function canonicalizeOpenApiDocument(document: Record<string, unknown>) {
  const normalized = sortObjectKeys(document) as Record<string, unknown>;

  if (normalized.info && typeof normalized.info === "object") {
    const info = normalized.info as Record<string, unknown>;
    if (
      typeof info.version === "string" &&
      /\d{4}-\d{2}-\d{2}T/.test(info.version)
    ) {
      info.version = "1.0.0";
    }
  }

  return normalized;
}

export function createOpenApiDocument(
  app: INestApplication,
): Record<string, unknown> {
  const config = new DocumentBuilder()
    .setTitle("Blueprint API")
    .setVersion("1.0.0")
    .addServer(`/${API_PREFIX}`)
    .addCookieAuth("access", { type: "apiKey", in: "cookie" })
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  }) as unknown as Record<string, unknown>;
}

export function writeCanonicalOpenApiDocument(
  document: Record<string, unknown>,
  outputPath: string,
) {
  const normalized = canonicalizeOpenApiDocument(document);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`);
}

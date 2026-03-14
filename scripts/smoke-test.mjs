#!/usr/bin/env node

const apiOrigin = process.env.SMOKE_API_ORIGIN || "http://localhost:4000";
const webOrigin = process.env.SMOKE_WEB_ORIGIN || "http://localhost:3000";
const apiBasePath = process.env.SMOKE_API_BASE_PATH || "/api/v1";
const adminEmail = process.env.SMOKE_ADMIN_EMAIL || "admin@example.com";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
const requestTimeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10000);

const normalizedApiBasePath = apiBasePath.endsWith("/")
  ? apiBasePath.slice(0, -1)
  : apiBasePath;
const apiBaseUrl = `${apiOrigin}${normalizedApiBasePath}`;

if (!adminPassword) {
  console.error("❌ Missing required env var: SMOKE_ADMIN_PASSWORD");
  process.exit(1);
}

function ensureOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function withTimeout(signal, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function requestJson(url, options = {}) {
  const timeout = withTimeout(options.signal, requestTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: timeout.signal,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      response,
      body,
    };
  } finally {
    timeout.clear();
  }
}

function extractCookie(response, cookieName) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    return null;
  }

  const firstCookie = setCookie.split(",").find((chunk) =>
    chunk.trimStart().startsWith(`${cookieName}=`),
  );

  if (!firstCookie) {
    return null;
  }

  return firstCookie.split(";")[0].trim();
}

async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

let accessCookie;

await runCheck("API health endpoint", async () => {
  const { response, body } = await requestJson(`${apiOrigin}/health`);
  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(
    typeof body === "object" && body !== null && body.status === "ok",
    `Unexpected health response: ${JSON.stringify(body)}`,
  );
});

await runCheck("Login endpoint", async () => {
  const { response, body } = await requestJson(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(
    typeof body === "object" && body !== null && body.user,
    `Unexpected login response: ${JSON.stringify(body)}`,
  );

  accessCookie = extractCookie(response, "access");
  ensureOk(accessCookie, "Missing access cookie from login response");
});

await runCheck("Admin authentication", async () => {
  const { response, body } = await requestJson(`${apiBaseUrl}/content/pages`, {
    headers: {
      cookie: accessCookie,
    },
  });

  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(Array.isArray(body), `Unexpected admin response body`);
});

await runCheck("Public content endpoint", async () => {
  const { response, body } = await requestJson(`${apiBaseUrl}/public/content/pages`);
  ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
  ensureOk(Array.isArray(body), `Unexpected public content response body`);
});

await runCheck("Sitemap endpoint", async () => {
  const timeout = withTimeout(undefined, requestTimeoutMs);

  try {
    const response = await fetch(`${webOrigin}/sitemap.xml`, {
      signal: timeout.signal,
    });
    const body = await response.text();

    ensureOk(response.status === 200, `Expected 200, got ${response.status}`);
    ensureOk(
      body.includes("<urlset") || body.includes("<sitemapindex"),
      "Sitemap response is not valid XML sitemap output",
    );
  } finally {
    timeout.clear();
  }
});

console.log("\n🎉 Smoke test completed successfully.");

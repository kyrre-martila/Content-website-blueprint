import { getApiBaseUrl } from "../../../lib/api";

async function readRequestBody(req: Request): Promise<string | undefined> {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return undefined;
  }
  return req.text();
}

function cloneHeaders(source: Headers): Headers {
  const target = new Headers();
  source.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      target.append(key, value);
    } else {
      target.set(key, value);
    }
  });
  return target;
}

function resolveApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedEndpoint = endpoint.replace(/^\//, "");
  return new URL(normalizedEndpoint, normalizedBase).toString();
}

export async function proxyAuthRequest(req: Request, endpoint: string): Promise<Response> {
  const url = resolveApiUrl(endpoint);

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");

  const body = await readRequestBody(req);

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseBody = await upstream.text();
  const responseHeaders = cloneHeaders(upstream.headers);

  if (!responseHeaders.has("location") && upstream.ok) {
    try {
      const parsed = JSON.parse(responseBody);
      const redirect = parsed?.redirect;
      if (typeof redirect === "string" && redirect.length > 0) {
        // Ensure the Location header is preserved for e2e checks.
        responseHeaders.set("Location", redirect);
      }
    } catch {
      // ignore JSON parse issues
    }
  }

  return new Response(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { isHardenedEnvironment } from "../config/runtime-env";

const MOBILE_PATH_REGEX = /^\/api\/v1\/mobile\//;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function shouldBypassCsrf(req: Request): boolean {
  if (MOBILE_PATH_REGEX.test(req.path)) {
    return true;
  }
  const authorization = req.headers.authorization;
  return (
    typeof authorization === "string" &&
    authorization.toLowerCase().startsWith("bearer ")
  );
}

function shouldSetSecureCookie(_req: Request, isProd: boolean): boolean {
  if (!isProd) {
    return false;
  }
  return true;
}

function createToken(secret: string, hmacSecret: string): string {
  return createHmac("sha256", hmacSecret).update(secret).digest("base64url");
}

function safeTokenEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readHeaderToken(req: Request): string | undefined {
  const token = req.headers["x-csrf-token"];
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

export function createCsrfMiddleware(config: ConfigService): RequestHandler {
  const isProd = isHardenedEnvironment({
    NODE_ENV: config.get<string>("NODE_ENV"),
    APP_ENV: config.get<string>("APP_ENV"),
    DEPLOY_ENV: config.get<string>("DEPLOY_ENV"),
  });
  const cookieDomain = config.get<string>("COOKIE_DOMAIN") ?? undefined;
  const csrfCookieName = config.get<string>("CSRF_COOKIE_NAME") ?? "XSRF-TOKEN";
  const csrfSecretCookieName = `${csrfCookieName}-SECRET`;
  const hmacSecret = config.getOrThrow<string>("COOKIE_SECRET");

  return (req: Request, res: Response, next: NextFunction) => {
    if (shouldBypassCsrf(req)) {
      return next();
    }

    const secureCookie = shouldSetSecureCookie(req, isProd);
    const secretCookie = req.signedCookies?.[csrfSecretCookieName] as
      | string
      | undefined;

    const csrfToken = secretCookie ? createToken(secretCookie, hmacSecret) : undefined;

    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      const secret = secretCookie ?? randomBytes(32).toString("base64url");
      const token = csrfToken ?? createToken(secret, hmacSecret);

      res.cookie(csrfSecretCookieName, secret, {
        httpOnly: true,
        sameSite: "strict",
        secure: secureCookie,
        path: "/",
        domain: cookieDomain,
        signed: true,
      });

      res.cookie(csrfCookieName, token, {
        httpOnly: false,
        sameSite: "strict",
        secure: secureCookie,
        path: "/",
        domain: cookieDomain,
      });

      return next();
    }

    const headerToken = readHeaderToken(req);
    if (!secretCookie || !csrfToken || !headerToken || !safeTokenEquals(csrfToken, headerToken)) {
      return res.status(403).json({ message: "Invalid CSRF token" });
    }

    return next();
  };
}

import type { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";

import { createCsrfMiddleware } from "../../src/middleware/csrf.middleware";

type MockRequest = Partial<Request> & {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  signedCookies?: Record<string, string | undefined>;
  secure?: boolean;
};

type MockResponse = Partial<Response> & {
  cookie: jest.Mock;
  status: jest.Mock;
  json: jest.Mock;
};

function buildConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = {
    COOKIE_SECRET: "cookie-secret",
    NODE_ENV: "development",
    CSRF_COOKIE_NAME: "XSRF-TOKEN",
    ...overrides,
  };

  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const value = values[key];
      if (!value) {
        throw new Error(`Missing config: ${key}`);
      }
      return value;
    },
  } as unknown as ConfigService;
}

function buildResponse(): MockResponse {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  return {
    cookie: jest.fn(),
    status,
    json,
  } as unknown as MockResponse;
}

describe("createCsrfMiddleware", () => {
  it("sets readable and secret csrf cookies on GET", () => {
    const middleware = createCsrfMiddleware(buildConfig());
    const req: MockRequest = {
      method: "GET",
      path: "/api/v1/admin/posts",
      headers: {},
      signedCookies: {},
      secure: false,
    };
    const res = buildResponse();
    const next = jest.fn();

    middleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      "XSRF-TOKEN-SECRET",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, signed: true }),
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      "XSRF-TOKEN",
      expect.any(String),
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it("rejects mutating requests when header token is missing", () => {
    const middleware = createCsrfMiddleware(buildConfig());
    const req: MockRequest = {
      method: "POST",
      path: "/api/v1/admin/posts",
      headers: {},
      signedCookies: {},
      secure: false,
    };
    const res = buildResponse();
    const next = jest.fn();

    middleware(req as Request, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid CSRF token" });
  });

  it("accepts mutating requests when header token matches derived secret", () => {
    const middleware = createCsrfMiddleware(buildConfig());

    const bootstrapReq: MockRequest = {
      method: "GET",
      path: "/api/v1/admin/posts",
      headers: {},
      signedCookies: {},
      secure: false,
    };
    const bootstrapRes = buildResponse();
    middleware(
      bootstrapReq as Request,
      bootstrapRes as unknown as Response,
      jest.fn(),
    );

    const secret = bootstrapRes.cookie.mock.calls[0][1] as string;
    const token = bootstrapRes.cookie.mock.calls[1][1] as string;

    const req: MockRequest = {
      method: "PATCH",
      path: "/api/v1/admin/posts",
      headers: { "x-csrf-token": token },
      signedCookies: { "XSRF-TOKEN-SECRET": secret },
      secure: false,
    };
    const res = buildResponse();
    const next = jest.fn();

    middleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("bypasses csrf validation for bearer-token requests", () => {
    const middleware = createCsrfMiddleware(buildConfig());
    const req: MockRequest = {
      method: "POST",
      path: "/api/v1/admin/posts",
      headers: { authorization: "Bearer abc" },
      signedCookies: {},
      secure: false,
    };
    const res = buildResponse();
    const next = jest.fn();

    middleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });


  it("marks csrf cookies as secure in staging environments", () => {
    const middleware = createCsrfMiddleware(
      buildConfig({ NODE_ENV: "production", DEPLOY_ENV: "staging" }),
    );
    const req: MockRequest = {
      method: "GET",
      path: "/api/v1/admin/posts",
      headers: {},
      signedCookies: {},
      secure: false,
    };
    const res = buildResponse();

    middleware(req as Request, res as unknown as Response, jest.fn());

    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      "XSRF-TOKEN-SECRET",
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      "XSRF-TOKEN",
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });

});

import {
  redactErrorForLogs,
  redactSensitiveData,
} from "../../src/common/logging/redaction.util";

describe("redactSensitiveData", () => {
  it("redacts sensitive keys recursively in request-like payloads", () => {
    const payload = {
      email: "user@example.com",
      password: "plain-secret",
      token: "abc",
      refreshToken: "def",
      nested: {
        authorization: "Bearer foo",
        secret: "xyz",
      },
      headers: {
        cookie: "sid=abc123; theme=dark",
      },
      items: [{ password: "one" }, { publicValue: "ok" }],
    };

    expect(redactSensitiveData(payload)).toEqual({
      email: "user@example.com",
      password: "[REDACTED]",
      token: "[REDACTED]",
      refreshToken: "[REDACTED]",
      nested: {
        authorization: "[REDACTED]",
        secret: "[REDACTED]",
      },
      headers: {
        cookie: "sid=[REDACTED]; theme=[REDACTED]",
      },
      items: [{ password: "[REDACTED]" }, { publicValue: "ok" }],
    });
  });
});

describe("redactErrorForLogs", () => {
  it("keeps error shape while redacting sensitive values", () => {
    const err = new Error("boom") as Error & {
      token?: string;
      details?: Record<string, unknown>;
    };
    err.token = "secret-token";
    err.details = { password: "plain", context: "safe" };

    expect(redactErrorForLogs(err)).toMatchObject({
      name: "Error",
      message: "boom",
      token: "[REDACTED]",
      details: {
        password: "[REDACTED]",
        context: "safe",
      },
    });
  });
});

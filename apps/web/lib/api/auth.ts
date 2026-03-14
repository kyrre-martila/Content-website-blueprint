import { apiFetch } from "../api";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type AuthResponse = {
  user: AuthUser;
};

export class AuthError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

async function handleResponse(res: Response): Promise<AuthResponse> {
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let message = "Unexpected error";
    if (isJson) {
      try {
        const data = await res.json();
        message = data.message || data.error || message;
      } catch {
        // ignore
      }
    }
    throw new AuthError(message, res.status);
  }

  if (!isJson) {
    throw new AuthError("Invalid response from server", res.status);
  }

  const data = (await res.json()) as AuthResponse;
  if (!data || !data.user) {
    throw new AuthError("Malformed auth response", res.status);
  }

  return data;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return handleResponse(res);
}

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return handleResponse(res);
}

export async function forgotPassword(input: { email: string }): Promise<{ success: boolean }> {
  const res = await apiFetch("/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    throw new AuthError("Could not send reset link", res.status);
  }

  if (!contentType.includes("application/json")) {
    return { success: true };
  }

  return (await res.json()) as { success: boolean };
}

export async function resetPassword(input: { token: string; password: string }): Promise<{ success: boolean }> {
  const res = await apiFetch("/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    let message = "Could not reset password";
    if (contentType.includes("application/json")) {
      try {
        const data = await res.json();
        message = data.message || data.error || message;
      } catch {
        // ignore
      }
    }
    throw new AuthError(message, res.status);
  }

  if (!contentType.includes("application/json")) {
    return { success: true };
  }

  return (await res.json()) as { success: boolean };
}

import { NextResponse } from "next/server";
import { buildForwardHeaders, getApiBase } from "./utils";

type MeResponse = {
  user?: {
    role?: string;
  };
};

function canAccessAdmin(role: string | undefined): boolean {
  if (!role) {
    return false;
  }

  const normalized = role.toUpperCase();
  return normalized === "ADMIN" || normalized === "EDITOR";
}

export async function requireAdminOrEditor(): Promise<NextResponse | null> {
  const res = await fetch(`${getApiBase()}/me`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = (await res.json().catch(() => null)) as MeResponse | null;
  if (!canAccessAdmin(data?.user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

import { NextResponse } from "next/server";

import { requireMinimumAdminRole } from "../auth";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const upstream = query
    ? `${getApiBase()}/admin/audit-logs?${query}`
    : `${getApiBase()}/admin/audit-logs`;

  const res = await fetch(upstream, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load audit logs" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}

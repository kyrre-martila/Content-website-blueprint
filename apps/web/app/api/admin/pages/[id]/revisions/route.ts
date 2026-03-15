import { requireMinimumAdminRole } from "../../../auth";
import { proxyAdminJson } from "../../../upstream";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole("editor");
  if (denied) return denied;

  const { id } = await params;
  const searchParams = new URL(request.url).searchParams;
  const upstreamQuery = new URLSearchParams();
  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");

  if (limit) {
    upstreamQuery.set("limit", limit);
  }
  if (cursor) {
    upstreamQuery.set("cursor", cursor);
  }

  const queryString = upstreamQuery.toString();

  return proxyAdminJson(
    `/admin/content/pages/${encodeURIComponent(id)}/revisions${
      queryString ? `?${queryString}` : ""
    }`,
    {
      method: "GET",
      errorMessage: "Failed to load page revisions",
    },
  );
}

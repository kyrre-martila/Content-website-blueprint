import { requireMinimumAdminRole } from "../../../auth";
import { proxyAdminJson } from "../../../upstream";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole("editor");
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(
    `/admin/content/items/${encodeURIComponent(id)}/duplicate`,
    {
      method: "POST",
      request,
      errorMessage: "Failed to duplicate content item",
    },
  );
}

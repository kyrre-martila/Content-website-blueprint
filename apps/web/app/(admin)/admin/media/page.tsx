import { MediaManagerClient } from "./MediaManagerClient";
import { listAdminMedia } from "../../../../lib/admin/media";

export default async function AdminMediaPage() {
  const media = await listAdminMedia();

  return <MediaManagerClient initialMedia={media} />;
}

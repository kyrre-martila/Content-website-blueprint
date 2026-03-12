import { redirect } from "next/navigation";

import { getMe } from "../../../../lib/me";
import { hasMinimumRole } from "../../../../lib/rbac";

export default async function AdminStagingPage() {
  const me = await getMe();
  if (!me?.user || !hasMinimumRole(me.user.role, "admin")) {
    redirect("/access-denied");
  }

  return (
    <section className="hero" aria-labelledby="staging-heading">
      <p className="hero__eyebrow">Website operations</p>
      <h1 id="staging-heading" className="hero__title">
        Staging access
      </h1>
      <p className="hero__subtitle">
        Use this area to validate content changes before public launch. Editors
        do not have access to staging controls.
      </p>
    </section>
  );
}

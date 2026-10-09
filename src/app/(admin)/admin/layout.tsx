import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/session";
import { Logo } from "@/components/logo";
import { AdminTabs } from "@/components/admin/admin-tabs";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Torque staff only (ADMIN_EMAILS). Everyone else gets a 404. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const t = await getTranslations("admin");
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-bg-elevated pt-safe">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo compact />
            <span className="font-display font-bold">{t("title")}</span>
          </div>
          <span className="truncate text-xs text-muted">{admin.email}</span>
        </div>
        <div className="mx-auto max-w-5xl px-4">
          <AdminTabs />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

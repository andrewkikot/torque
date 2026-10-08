import { requireAcceptedUser } from "@/lib/session";
import { AppNav } from "@/components/app-nav";
import { getCurrentWorkshop } from "@/lib/workshop-context";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireAcceptedUser();
  const ws = await getCurrentWorkshop(user.id);
  const workshop = ws ? { name: ws.workshop.name, logoUrl: ws.workshop.logoUrl, accentColor: ws.workshop.accentColor } : null;
  return (
    <div className="min-h-dvh lg:pl-64">
      <AppNav userName={user.name || user.email} workshop={workshop} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
    </div>
  );
}

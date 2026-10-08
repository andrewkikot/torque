import { requireUser } from "@/lib/session";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh lg:pl-64">
      <AppNav userName={user.name || user.email} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
    </div>
  );
}

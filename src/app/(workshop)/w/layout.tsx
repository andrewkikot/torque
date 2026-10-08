import { getCurrentUser } from "@/lib/session";
import { getCurrentWorkshop } from "@/lib/workshop-context";
import { WorkshopNav } from "@/components/workshop/workshop-nav";

/**
 * Workshop area. Auth is enforced per page (join/check-in links must survive sign-in),
 * so the layout only adds chrome when the user belongs to a workshop.
 */
export default async function WorkshopLayout({ children }: LayoutProps<"/w">) {
  const user = await getCurrentUser();
  const ws = user ? await getCurrentWorkshop(user.id) : null;
  if (!ws) return <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">{children}</main>;
  return (
    <div className="min-h-dvh lg:pl-64" style={{ ["--accent" as string]: ws.workshop.accentColor }}>
      <WorkshopNav name={ws.workshop.name} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth-server";
import { logout } from "@/app/admin/actions";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "inbox — odd jobs",
  robots: { index: false, follow: false },
};

/**
 * The auth gate for everything under /admin. Checking here rather than in each
 * page means a new admin route is protected by existing, not by remembering.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        trail={[{ label: "inbox", href: "/admin" }]}
        actions={
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-white/40 transition-colors hover:text-white"
            >
              log out
            </button>
          </form>
        }
      />
      <main className="flex-1 px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}

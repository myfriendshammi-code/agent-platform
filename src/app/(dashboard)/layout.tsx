import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { isStaffRole } from "@/lib/auth/roles";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <DashboardNav
        userName={session?.user?.name}
        userEmail={session?.user?.email ?? ""}
        showAdmin={session?.user?.role ? isStaffRole(session.user.role) : false}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

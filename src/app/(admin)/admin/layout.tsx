import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin/users" className="text-lg font-semibold">
              Admin
            </Link>
            <nav className="flex gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground")}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{session?.user?.email}</span>
            <Link href="/dashboard" className="underline underline-offset-4">
              Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export async function generateMetadata() {
  return { title: "Admin" };
}

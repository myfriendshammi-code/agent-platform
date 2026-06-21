"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/form";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({
  userName,
  userEmail,
  showAdmin,
}: {
  userName?: string | null;
  userEmail: string;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            AgentPlatform
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  pathname === link.href ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
            {showAdmin && (
              <Link
                href="/admin/users"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  pathname.startsWith("/admin")
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs sm:block">
            <p className="font-medium">{userName ?? "User"}</p>
            <p className="text-muted-foreground">{userEmail}</p>
          </div>
          <Button variant="secondary" type="button" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

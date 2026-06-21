import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

function isStaff(role: string | undefined) {
  return role === "support" || role === "admin" || role === "super_admin";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isVerified = !!req.auth?.user?.emailVerified;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isVerifyRoute = pathname.startsWith("/verify-email");

  if (isAuthRoute && isLoggedIn && isVerified) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }

    if (!isVerified && !isVerifyRoute) {
      return NextResponse.redirect(new URL("/verify-email", req.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!isStaff(req.auth?.user?.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password/:path*",
    "/verify-email/:path*",
  ],
};

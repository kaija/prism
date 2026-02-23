import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Next.js middleware — runs on every matched request.
 *
 * 1. Unauthenticated visitors are redirected to the sign-in page.
 * 2. Route-level RBAC is handled by individual page components
 *    (they have access to DB for role lookups). The middleware
 *    only enforces authentication.
 */
export default auth(async (req) => {
  const { nextUrl } = req;
  const session = req.auth;

  // --- Public routes that don't require authentication ---
  const publicPaths = ["/auth/signin", "/auth/signup", "/auth/verify", "/api/auth"];
  if (publicPaths.some((p) => nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // --- Redirect unauthenticated users to sign-in ---
  if (!session?.user) {
    const signInUrl = new URL("/auth/signin", nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const runtime = "nodejs";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

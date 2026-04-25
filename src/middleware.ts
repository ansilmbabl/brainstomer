import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const p = req.nextUrl.pathname;
  if (p.startsWith("/api")) {
    return NextResponse.next();
  }
  if (p === "/login" || p === "/register") {
    return NextResponse.next();
  }
  if (!req.auth) {
    const u = new URL("/login", req.nextUrl.origin);
    u.searchParams.set("callbackUrl", p);
    return NextResponse.redirect(u);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};

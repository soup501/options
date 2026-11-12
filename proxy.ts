import { auth } from "@/auth";
import { BASE_PATH } from "@/lib/base-path";

export default auth((request) => {
  if (request.auth) return;
  const loginUrl = new URL(`${BASE_PATH}/login`, request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return Response.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};

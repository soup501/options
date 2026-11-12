import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { BASE_PATH } from "@/lib/base-path";

// Next strips basePath from route requests, but Auth.js derives its action from the full AUTH_URL path.
function withBasePath(handler: (request: NextRequest) => Promise<Response>) {
  return (request: NextRequest) => {
    const url = new URL(request.url);
    url.pathname = `${BASE_PATH}${url.pathname}`;
    return handler(new NextRequest(url, request));
  };
}

export const GET = withBasePath(handlers.GET);
export const POST = withBasePath(handlers.POST);

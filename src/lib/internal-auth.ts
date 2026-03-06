import { NextResponse } from "next/server";

type RequestWithHeaders = Pick<Request, "headers">;

function readBearerToken(request: RequestWithHeaders): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

function requireStaticBearerToken(
  request: RequestWithHeaders,
  envName: "ADMIN_SERVICE_TOKEN" | "CRON_SECRET"
): NextResponse | null {
  const expected = process.env[envName];
  if (!expected) {
    console.error(`[auth] Missing ${envName}`);
    return NextResponse.json(
      { error: "Server auth is not configured" },
      { status: 500 }
    );
  }

  if (readBearerToken(request) !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export function requireAdminServiceRequest(
  request: RequestWithHeaders
): NextResponse | null {
  return requireStaticBearerToken(request, "ADMIN_SERVICE_TOKEN");
}

export function requireCronRequest(
  request: RequestWithHeaders
): NextResponse | null {
  return requireStaticBearerToken(request, "CRON_SECRET");
}

export function hasAdminServiceToken(request: RequestWithHeaders): boolean {
  const expected = process.env.ADMIN_SERVICE_TOKEN;
  return !!expected && readBearerToken(request) === expected;
}

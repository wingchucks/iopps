// School and education-program directories are no longer offered on IOPPS.
// Historical records are retained; this public directory feed is retired.
// Schools may still take part as organizations with jobs, events and scholarships.
export const dynamic = "force-dynamic";

function retired() {
  return Response.json(
    { error: "School and program directories are no longer available on IOPPS.", code: "ENDPOINT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = retired;

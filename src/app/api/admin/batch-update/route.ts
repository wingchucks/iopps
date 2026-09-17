export const runtime = "nodejs";

// A cron secret cannot authorize arbitrary updates across account boundaries.
export async function POST() {
  return Response.json(
    { error: "This legacy maintenance endpoint has been retired.", code: "ENDPOINT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

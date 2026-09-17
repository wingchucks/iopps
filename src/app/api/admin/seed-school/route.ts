export const runtime = "nodejs";

// Organization changes must use the scoped, authenticated organization workflows.
export async function POST() {
  return Response.json(
    { error: "This legacy maintenance endpoint has been retired.", code: "ENDPOINT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

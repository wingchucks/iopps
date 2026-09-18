export const runtime = "nodejs";

// Bulk deletion belongs in reviewed maintenance work, never a public API route.
export async function POST() {
  return Response.json(
    { error: "This legacy maintenance endpoint has been retired.", code: "ENDPOINT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export const runtime = "nodejs";

// Arbitrary collection writes must never be exposed through a maintenance secret.
export async function POST() {
  return Response.json(
    { error: "This legacy maintenance endpoint has been retired.", code: "ENDPOINT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

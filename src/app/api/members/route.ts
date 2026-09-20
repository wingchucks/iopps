export const dynamic = "force-dynamic";

// Member browsing is retired. Own accounts, applicants and administration use
// their existing authenticated, purpose-scoped paths instead.
export async function GET() {
  return Response.json(
    { error: "Member browsing is no longer available", code: "ENDPOINT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

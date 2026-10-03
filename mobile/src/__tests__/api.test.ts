import { apiRequest, ApiError, API_BASE } from "../lib/api";

const { auth } = jest.requireMock("../lib/firebase") as { auth: { currentUser: unknown } };
const mockFetch = jest.fn();

function respond(status: number, body: unknown, json = true) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: json ? async () => body : async () => { throw new SyntaxError("Unexpected token <"); },
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as { fetch: unknown }).fetch = mockFetch;
  auth.currentUser = null;
});

describe("apiRequest", () => {
  it("reads public data without a sign-in token", async () => {
    mockFetch.mockResolvedValue(respond(200, { jobs: [] }));
    await expect(apiRequest("/api/jobs")).resolves.toEqual({ jobs: [] });
    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/api/jobs`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: undefined,
    });
  });

  it("sends the member's ID token and a JSON body", async () => {
    auth.currentUser = { getIdToken: async () => "id-token" };
    mockFetch.mockResolvedValue(respond(201, { created: true }));
    await apiRequest("/api/applications", { method: "POST", body: { postId: "job-1" }, signedIn: true });
    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/api/applications`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer id-token" },
      signal: undefined,
      body: JSON.stringify({ postId: "job-1" }),
    });
  });

  it("asks a signed-out member to sign in without calling the API", async () => {
    await expect(apiRequest("/api/applications", { signedIn: true })).rejects.toMatchObject({ status: 401 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("surfaces the API's own error message and code", async () => {
    mockFetch.mockResolvedValue(respond(403, { error: "Please verify your email.", code: "auth/email-not-verified" }));
    const error = await apiRequest("/api/applications").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Please verify your email.", status: 403, code: "auth/email-not-verified" });
  });

  it("falls back to a plain message when the failure is not JSON", async () => {
    mockFetch.mockResolvedValue(respond(502, null, false));
    await expect(apiRequest("/api/jobs")).rejects.toMatchObject({
      message: "Something went wrong. Please try again.",
      status: 502,
      code: undefined,
    });
  });
});

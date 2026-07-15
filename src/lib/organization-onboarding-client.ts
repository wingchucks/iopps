type FetchLike = typeof fetch;

interface RequestOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

interface UploadLogoResult {
  url: string;
}

const DEFAULT_TIMEOUT_MS = 20_000;

async function parseError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error || fallback;
}

async function requestWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  options: RequestOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    return await (options.fetchImpl ?? fetch)(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The save took too long. Please check your connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadOrganizationOnboardingLogo(
  file: File,
  idToken: string,
  options: RequestOptions = {},
): Promise<UploadLogoResult> {
  const formData = new FormData();
  formData.append("slot", "logo");
  formData.append("file", file);

  const response = await requestWithTimeout(
    "/api/org/upload",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData,
    },
    options,
  );

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to upload organization logo"));
  }

  const payload = (await response.json()) as Partial<UploadLogoResult>;
  if (!payload.url) throw new Error("The logo upload completed without a usable URL.");
  return { url: payload.url };
}

export async function saveOrganizationOnboardingProgress(
  fields: Record<string, unknown>,
  idToken: string,
  options: RequestOptions = {},
): Promise<void> {
  const response = await requestWithTimeout(
    "/api/employer/profile",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fields),
    },
    options,
  );

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to save organization details"));
  }
}

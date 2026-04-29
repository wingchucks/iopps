export type UpgradeResponse = {
  error?: string;
  message?: string;
  success?: boolean;
  slug?: string;
};

export const UPGRADE_FALLBACK_ERROR =
  "We couldn't create your organization page. Please try again.";

function readStringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getUpgradeErrorMessage(data: UpgradeResponse): string {
  return readStringField(data.error) || readStringField(data.message) || UPGRADE_FALLBACK_ERROR;
}

function readPlainTextError(text: string): string | undefined {
  const trimmed = text.trim();
  const looksLikeMarkup = /<\s*\/?\s*[a-z!][^>]*>/i.test(trimmed);

  if (!trimmed || trimmed.length > 300 || looksLikeMarkup) {
    return undefined;
  }

  return trimmed;
}

export async function readUpgradeResponse(res: Response): Promise<UpgradeResponse> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    return {};
  }

  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const data = parsed as Record<string, unknown>;
    return {
      error: readStringField(data.error),
      message: readStringField(data.message),
      success: typeof data.success === "boolean" ? data.success : undefined,
      slug: readStringField(data.slug),
    };
  } catch {
    const plainTextError = readPlainTextError(trimmed);
    return plainTextError ? { error: plainTextError } : {};
  }
}

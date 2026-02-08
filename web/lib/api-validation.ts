/**
 * Lightweight API input validation utilities.
 *
 * No external dependencies -- uses simple TypeScript type guards and string
 * helpers so we don't need Zod or any schema library.
 */

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

/**
 * Return a JSON 400 response with a structured error payload.
 */
export function validationError(message: string, code?: string) {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status: 400 }
  );
}

// ---------------------------------------------------------------------------
// Required-field checks
// ---------------------------------------------------------------------------

/**
 * Verify that every key in `fields` exists on `body` and is non-empty.
 *
 * Returns `null` when all fields are present, or a `NextResponse` that can
 * be returned directly from the route handler.
 */
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): NextResponse | null {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ""
  );
  if (missing.length > 0) {
    return validationError(
      `Missing required fields: ${missing.join(", ")}`
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scalar validators
// ---------------------------------------------------------------------------

interface StringOptions {
  minLength?: number;
  maxLength?: number;
  /** Regex pattern the value must match. */
  pattern?: RegExp;
}

/**
 * Validate that `value` is a string and satisfies optional constraints.
 *
 * Returns an error message string on failure, or `null` on success.
 */
export function validateString(
  value: unknown,
  fieldName: string,
  opts: StringOptions = {}
): string | null {
  if (typeof value !== "string") {
    return `${fieldName} must be a string`;
  }
  if (opts.minLength !== undefined && value.length < opts.minLength) {
    return `${fieldName} must be at least ${opts.minLength} characters`;
  }
  if (opts.maxLength !== undefined && value.length > opts.maxLength) {
    return `${fieldName} must be ${opts.maxLength} characters or fewer`;
  }
  if (opts.pattern && !opts.pattern.test(value)) {
    return `${fieldName} has an invalid format`;
  }
  return null;
}

/**
 * Validate that `value` is one of the allowed enum values.
 *
 * Returns an error message string on failure, or `null` on success.
 */
export function validateEnum(
  value: unknown,
  fieldName: string,
  allowed: readonly string[]
): string | null {
  if (typeof value !== "string" || !allowed.includes(value)) {
    return `${fieldName} must be one of: ${allowed.join(", ")}`;
  }
  return null;
}

interface NumberOptions {
  min?: number;
  max?: number;
}

/**
 * Validate that `value` is a finite number within optional bounds.
 *
 * Accepts both `number` and numeric string inputs (the latter is parsed).
 * Returns an error message string on failure, or `null` on success.
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  opts: NumberOptions = {}
): string | null {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (opts.min !== undefined && num < opts.min) {
    return `${fieldName} must be at least ${opts.min}`;
  }
  if (opts.max !== undefined && num > opts.max) {
    return `${fieldName} must be at most ${opts.max}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sanitisation
// ---------------------------------------------------------------------------

/**
 * Trim whitespace and strip HTML tags from a string value.
 *
 * Mirrors the pattern already used in the flags route.
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/<[^>]*>/g, "");
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

/**
 * Validate that `value` looks like a valid HTTP(S) URL.
 *
 * Returns an error message string on failure, or `null` on success.
 */
export function validateUrl(
  value: unknown,
  fieldName: string
): string | null {
  if (typeof value !== "string") {
    return `${fieldName} must be a string`;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return `${fieldName} must use http or https protocol`;
    }
  } catch {
    return `${fieldName} must be a valid URL`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate that `value` looks like a valid email address.
 *
 * Returns an error message string on failure, or `null` on success.
 */
export function validateEmail(
  value: unknown,
  fieldName: string
): string | null {
  if (typeof value !== "string" || !EMAIL_REGEX.test(value)) {
    return `${fieldName} must be a valid email address`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// ISO date-string validation
// ---------------------------------------------------------------------------

/**
 * Validate that `value` is a parseable date string.
 *
 * Returns an error message string on failure, or `null` on success.
 */
export function validateDateString(
  value: unknown,
  fieldName: string
): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return `${fieldName} must be a valid date string`;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return `${fieldName} must be a valid date`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Batch helper
// ---------------------------------------------------------------------------

/**
 * Run an array of individual field-level validation results (each either
 * `null` for OK or an error-message string) and return a 400 response with
 * the first error found, or `null` if everything is valid.
 */
export function firstError(
  checks: (string | null)[]
): NextResponse | null {
  const msg = checks.find((c) => c !== null);
  if (msg) {
    return validationError(msg);
  }
  return null;
}

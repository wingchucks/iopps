import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_FIELD_LENGTH = 500;

function validateContactForm(
  body: unknown,
): { valid: true; data: ContactFormData } | { valid: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Invalid request body" };
  }

  const { name, email, subject, message } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return { valid: false, error: "Name is required" };
  }

  if (name.trim().length > MAX_FIELD_LENGTH) {
    return { valid: false, error: `Name must be ${MAX_FIELD_LENGTH} characters or fewer` };
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return { valid: false, error: "A valid email address is required" };
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    return { valid: false, error: "Message is required" };
  }

  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` };
  }

  const sanitizedSubject =
    typeof subject === "string" ? subject.trim().slice(0, MAX_FIELD_LENGTH) : "";

  return {
    valid: true,
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: sanitizedSubject,
      message: message.trim(),
    },
  };
}

// ---------------------------------------------------------------------------
// POST /api/contact
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = validateContactForm(body);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { data } = result;

    // Log the submission (email integration comes in Phase 6)
    console.log("[Contact Form Submission]", {
      name: data.name,
      email: data.email,
      subject: data.subject,
      messageLength: data.message.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Thank you for your message. We will get back to you within two business days.",
    });
  } catch (error) {
    console.error("[POST /api/contact] Error:", error);
    return NextResponse.json(
      { error: "Failed to process contact form submission" },
      { status: 500 },
    );
  }
}

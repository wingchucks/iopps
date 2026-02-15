import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    if (!auth) {
      return NextResponse.json(
        { error: "Firebase Admin not initialized" },
        { status: 500 }
      );
    }

    // Verify the token and get claims
    const decodedToken = await auth.verifyIdToken(idToken);

    // Extract relevant info
    const response = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,

      // Custom claims (what we're looking for)
      customClaims: {
        admin: decodedToken.admin ?? null,
        moderator: decodedToken.moderator ?? null,
        role: decodedToken.role ?? null,
        // Include any other potential claim formats
        super_admin: decodedToken.super_admin ?? null,
        isAdmin: decodedToken.isAdmin ?? null,
      },

      // Raw custom claims (everything that's not standard)
      allCustomClaims: Object.fromEntries(
        Object.entries(decodedToken).filter(
          ([key]) =>
            ![
              "aud",
              "auth_time",
              "exp",
              "iat",
              "iss",
              "sub",
              "uid",
              "email",
              "email_verified",
              "firebase",
              "user_id",
            ].includes(key)
        )
      ),

      // What the Firestore rules expect
      expectedFormat: {
        description: "Firestore rules check for these claims:",
        adminCheck: "request.auth.token.admin == true",
        moderatorCheck: "request.auth.token.moderator == true",
        currentAdminValue: decodedToken.admin,
        currentModeratorValue: decodedToken.moderator,
        wouldPassAdminCheck: decodedToken.admin === true,
        wouldPassModeratorCheck: decodedToken.moderator === true,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error checking claims:", error);
    return NextResponse.json(
      {
        error: "Failed to verify token",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

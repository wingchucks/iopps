import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/admin/fix-missing-employer-profiles
 * One-time fix: Creates pending employer profiles for users with role=employer but no profile
 *
 * GET: Returns an HTML page with a button to run the fix
 * POST: Runs the fix (requires Bearer token)
 */
export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Fix Missing Employer Profiles</title>
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
  <style>
    body { font-family: system-ui; background: #0f172a; color: #e2e8f0; padding: 40px; max-width: 600px; margin: 0 auto; }
    h1 { color: #14b8a6; }
    button { background: #14b8a6; color: #0f172a; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px; }
    button:hover { background: #0d9488; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    pre { background: #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .error { color: #f87171; }
    .success { color: #4ade80; }
  </style>
</head>
<body>
  <h1>Fix Missing Employer Profiles</h1>
  <p>This will create pending employer profiles for users with role=employer who don't have one.</p>
  <button id="runBtn" onclick="runFix()">Run Fix</button>
  <div id="result"></div>

  <script>
    const firebaseConfig = {
      apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
      authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
      projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
    };
    firebase.initializeApp(firebaseConfig);

    async function runFix() {
      const btn = document.getElementById('runBtn');
      const result = document.getElementById('result');
      btn.disabled = true;
      btn.textContent = 'Running...';
      result.innerHTML = '';

      try {
        const user = firebase.auth().currentUser;
        if (!user) {
          result.innerHTML = '<p class="error">Not logged in. Please log in at <a href="/login" style="color:#14b8a6">/login</a> first, then return here.</p>';
          btn.disabled = false;
          btn.textContent = 'Run Fix';
          return;
        }

        const token = await user.getIdToken();
        const res = await fetch('/api/admin/fix-missing-employer-profiles', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success) {
          result.innerHTML = '<p class="success">Success!</p><pre>' + JSON.stringify(data, null, 2) + '</pre>';
        } else {
          result.innerHTML = '<p class="error">Error: ' + (data.error || 'Unknown error') + '</p>';
        }
      } catch (e) {
        result.innerHTML = '<p class="error">Error: ' + e.message + '</p>';
      }
      btn.disabled = false;
      btn.textContent = 'Run Fix';
    }

    // Check auth state on load
    firebase.auth().onAuthStateChanged(user => {
      if (!user) {
        document.getElementById('result').innerHTML = '<p class="error">Not logged in. Please <a href="/login" style="color:#14b8a6">log in</a> as admin first.</p>';
      }
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function POST(request: NextRequest) {
  return handleFix(request);
}

async function handleFix(request: NextRequest) {
  try {
    if (!auth || !db) {
      return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 });
    }

    // Verify admin auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Check if user is admin
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find all users with role=employer
    const usersSnapshot = await db
      .collection("users")
      .where("role", "==", "employer")
      .get();

    const results: { userId: string; email: string; action: string }[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Check if employer profile exists
      const employerDoc = await db.collection("employers").doc(userId).get();

      if (!employerDoc.exists) {
        // Create pending employer profile
        await db.collection("employers").doc(userId).set({
          id: userId,
          userId,
          organizationName: userData.displayName || userData.email?.split("@")[0] || "Unknown",
          contactEmail: userData.email || "",
          intent: null,
          status: "pending",
          description: "",
          website: "",
          location: "",
          logoUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        results.push({
          userId,
          email: userData.email || "no-email",
          action: "created_pending_profile",
        });
      } else {
        results.push({
          userId,
          email: userData.email || "no-email",
          action: "profile_already_exists",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalEmployerUsers: usersSnapshot.docs.length,
      results,
      created: results.filter(r => r.action === "created_pending_profile").length,
      skipped: results.filter(r => r.action === "profile_already_exists").length,
    });
  } catch (error) {
    console.error("[fix-missing-employer-profiles] Error:", error);
    return NextResponse.json(
      { error: "Failed to fix employer profiles" },
      { status: 500 }
    );
  }
}

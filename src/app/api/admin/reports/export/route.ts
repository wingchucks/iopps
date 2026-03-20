import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminToken(request);
  if (!auth.success) return auth.response;

  if (!adminDb) {
    return NextResponse.json({ error: "Firestore not initialized" }, { status: 500 });
  }

  const type = request.nextUrl.searchParams.get("type");

  let csv = "";
  let filename = "export.csv";

  switch (type) {
    case "users": {
      const snap = await adminDb.collection("users").get();
      const headers = ["ID", "Email", "Name", "Role", "Status", "Created At"];
      const rows = snap.docs.map((doc) => {
        const d = doc.data();
        return [doc.id, d.email || "", d.displayName || "", d.role || "", d.status || "", d.createdAt || ""];
      });
      csv = toCsv(headers, rows);
      filename = "users-export.csv";
      break;
    }
    case "jobs": {
      const snap = await adminDb.collection("jobs").get();
      const headers = ["ID", "Title", "Employer", "Location", "Status", "Views", "Applications", "Created At"];
      const rows = snap.docs.map((doc) => {
        const d = doc.data();
        return [doc.id, d.title || "", d.employerName || "", d.location || "", d.status || "", String(d.viewCount || 0), String(d.applicationCount || 0), d.createdAt || ""];
      });
      csv = toCsv(headers, rows);
      filename = "jobs-export.csv";
      break;
    }
    case "employers": {
      const snap = await adminDb.collection("users").where("role", "==", "employer").get();
      const headers = ["ID", "Email", "Company", "Status", "Created At"];
      const rows = snap.docs.map((doc) => {
        const d = doc.data();
        return [doc.id, d.email || "", d.companyName || d.displayName || "", d.status || "", d.createdAt || ""];
      });
      csv = toCsv(headers, rows);
      filename = "employers-export.csv";
      break;
    }
    case "applications": {
      const snap = await adminDb.collection("applications").get();
      const headers = ["ID", "Job ID", "Job Title", "Applicant ID", "Applicant Name", "Status", "Applied At"];
      const rows = snap.docs.map((doc) => {
        const d = doc.data();
        return [
          doc.id,
          d.jobId || "",
          d.jobTitle || "",
          d.applicantId || d.userId || "",
          d.applicantName || d.displayName || "",
          d.status || "",
          d.createdAt || d.appliedAt || "",
        ];
      });
      csv = toCsv(headers, rows);
      filename = "applications-export.csv";
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid type. Use users, jobs, employers, or applications." }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

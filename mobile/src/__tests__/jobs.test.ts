import { API_BASE } from "../lib/api";
import {
  applicationDestination,
  applyToJob,
  getJob,
  listJobs,
  listMyApplications,
  toJobPosting,
} from "../lib/jobs";

const { auth } = jest.requireMock("../lib/firebase") as { auth: { currentUser: unknown } };
const mockFetch = jest.fn();

function respond(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** The [method, path, body] of each request the app sent. */
function requests() {
  return mockFetch.mock.calls.map(([url, init]: [string, RequestInit]) => [
    init.method,
    url.replace(API_BASE, ""),
    init.body === undefined ? undefined : JSON.parse(String(init.body)),
  ]);
}

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as { fetch: unknown }).fetch = mockFetch;
  auth.currentUser = { getIdToken: async () => "id-token" };
});

describe("applicationDestination", () => {
  it("follows the website: no link or an employer's email link means an IOPPS application", () => {
    expect(applicationDestination({})).toEqual({ kind: "internal" });
    expect(applicationDestination({ applicationUrl: "mailto:hr@example.ca", employerId: "org-1" })).toEqual({ kind: "internal" });
    expect(applicationDestination({ applicationUrl: "hr@example.ca" })).toEqual({ kind: "email", email: "hr@example.ca" });
    expect(applicationDestination({ externalApplyUrl: "careers.example.ca/jobs/1" })).toEqual({
      kind: "external",
      href: "https://careers.example.ca/jobs/1",
    });
    expect(applicationDestination({ applicationLink: "javascript:alert(1)" })).toEqual({ kind: "unavailable" });
  });
});

describe("toJobPosting", () => {
  it("maps the website's public job to what the screens show", () => {
    const job = toJobPosting({
      id: "job-1",
      title: "Band Office Manager",
      orgName: "Example Nation",
      employerId: "org-1",
      location: "Saskatoon, SK",
      jobType: "Full Time",
      workLocation: "Remote",
      salary: "$23.00–$27.75 / hour",
      salaryRange: { min: 23, max: 27.75, period: "Hourly" },
      responsibilities: ["Lead the office", ""],
      requirements: "- Bookkeeping\n- Driver's licence",
      closingDate: "2026-11-01",
      requiresResume: true,
      featured: true,
      createdAt: "2026-10-01T12:00:00.000Z",
      applicationUrl: "https://careers.example.ca/1",
    });
    expect(job).toMatchObject({
      id: "job-1",
      employerName: "Example Nation",
      employmentType: "Full Time",
      remoteFlag: true,
      salaryRange: "$23.00–$27.75 / hour",
      responsibilities: ["Lead the office"],
      qualifications: ["Bookkeeping", "Driver's licence"],
      closingDate: "2026-11-01",
      requiresResume: true,
      requiresCoverLetter: false,
      quickApplyEnabled: false,
      applicationLink: "https://careers.example.ca/1",
      active: true,
      featured: true,
      createdAt: "2026-10-01T12:00:00.000Z",
    });
  });

  it("keeps a numeric salary range and an undisclosed salary when there is no label", () => {
    expect(toJobPosting({ id: "a", salaryRange: { min: 50000, max: 60000, currency: "CAD" } }).salaryRange).toEqual({
      min: 50000,
      max: 60000,
      currency: "CAD",
    });
    expect(toJobPosting({ id: "b", salaryRange: { disclosed: false } }).salaryRange).toEqual({ disclosed: false });
    expect(toJobPosting({ id: "c" }).salaryRange).toBeUndefined();
  });
});

describe("jobs API", () => {
  it("lists open jobs without signing in and skips records without an ID or title", async () => {
    auth.currentUser = null;
    mockFetch.mockResolvedValue(respond(200, { jobs: [{ id: "job-1", title: "Cook" }, { id: "job-2" }, null] }));
    const jobs = await listJobs();
    expect(jobs.map((job) => job.id)).toEqual(["job-1"]);
    expect(requests()).toEqual([["GET", "/api/jobs?limit=200", undefined]]);
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("marks a closed job and returns null for one that is gone", async () => {
    mockFetch.mockResolvedValueOnce(respond(200, { job: { id: "job/1", title: "Cook" }, closed: { closedOn: null } }));
    expect(await getJob("job/1")).toMatchObject({ id: "job/1", active: false });
    expect(requests()[0][1]).toBe("/api/jobs/job%2F1");

    mockFetch.mockResolvedValueOnce(respond(404, { error: "Job not found", unavailable: true }));
    expect(await getJob("gone")).toBeNull();

    mockFetch.mockResolvedValueOnce(respond(500, { error: "Failed to load job" }));
    await expect(getJob("broken")).rejects.toMatchObject({ status: 500, message: "Failed to load job" });
  });
});

describe("applications API", () => {
  it("lists the member's own applications with the website's statuses", async () => {
    mockFetch.mockResolvedValue(
      respond(200, {
        applications: [
          { id: "uid_job-1", postId: "job-1", postTitle: "Cook", orgName: "Cafe", status: "interview", appliedAt: { seconds: 1 } },
          { id: "uid_job-2", postId: "job-2", status: "archived-by-admin" },
        ],
      })
    );
    const applications = await listMyApplications();
    expect(applications).toEqual([
      { id: "uid_job-1", jobId: "job-1", jobTitle: "Cook", employerName: "Cafe", status: "interview", appliedAt: { seconds: 1 }, updatedAt: null },
      { id: "uid_job-2", jobId: "job-2", jobTitle: "", employerName: "", status: "submitted", appliedAt: null, updatedAt: null },
    ]);
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer id-token");
  });

  it("applies with the saved profile resume and then asks the website to email the employer", async () => {
    mockFetch.mockResolvedValueOnce(respond(201, { created: true })).mockResolvedValueOnce(respond(200, { sent: true }));
    await expect(
      applyToJob("job-1", { useProfileResume: true, coverLetter: "Hello", references: "" })
    ).resolves.toEqual({ created: true });
    expect(requests()).toEqual([
      ["POST", "/api/applications", { postId: "job-1", resumeType: "profile", resumeUrl: "", coverLetter: "Hello", references: "" }],
      ["POST", "/api/applications/notify", { postId: "job-1" }],
    ]);
  });

  it("keeps the application when the employer email fails, and does not resend for a repeat", async () => {
    mockFetch.mockResolvedValueOnce(respond(201, { created: true })).mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(applyToJob("job-1", { useProfileResume: false, coverLetter: "", references: "" })).resolves.toEqual({ created: true });
    expect(requests()[0][2]).toMatchObject({ resumeType: "file" });

    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(respond(200, { created: false }));
    await expect(applyToJob("job-1", { useProfileResume: false, coverLetter: "", references: "" })).resolves.toEqual({ created: false });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces the website's reason when an application is refused", async () => {
    mockFetch.mockResolvedValueOnce(respond(422, { error: "A resume file is required." }));
    await expect(applyToJob("job-1", { useProfileResume: false, coverLetter: "", references: "" })).rejects.toMatchObject({
      status: 422,
      message: "A resume file is required.",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

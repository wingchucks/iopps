import { API_BASE } from "../lib/api";
import {
  getEmployerApplication,
  listAllEmployerApplications,
  listEmployerApplications,
  listEmployerJobs,
  updateApplicationStatus,
} from "../lib/employer";

const { auth } = jest.requireMock("../lib/firebase") as { auth: { currentUser: unknown } };
const mockFetch = jest.fn();

function respond(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const paths = () => mockFetch.mock.calls.map(([url]: [string]) => url.replace(API_BASE, ""));

function page(applications: unknown[], nextCursor: string | null = null) {
  return respond(200, { applications, hasMore: nextCursor !== null, nextCursor, profiles: {}, jobs: {} });
}

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as { fetch: unknown }).fetch = mockFetch;
  auth.currentUser = { getIdToken: async () => "employer-token" };
});

describe("employer jobs", () => {
  it("lists drafts and closed jobs with their application counts", async () => {
    mockFetch.mockResolvedValue(
      respond(200, {
        jobs: [
          { id: "job-1", title: "Cook", status: "active", active: true, applicationCount: 3, createdAt: "2026-09-01T00:00:00.000Z" },
          { id: "job-2", title: "Clerk", status: "draft", active: false },
          { id: "job-3", title: "Driver", active: false },
        ],
      })
    );
    const jobs = await listEmployerJobs();
    expect(jobs.map((job) => [job.id, job.status, job.active, job.applicationCount])).toEqual([
      ["job-1", "active", true, 3],
      ["job-2", "draft", false, 0],
      ["job-3", "closed", false, 0],
    ]);
    expect(paths()).toEqual(["/api/employer/jobs"]);
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer employer-token");
  });
});

describe("employer applications", () => {
  it("shows what the applicant shared, then their member profile, and the job title", async () => {
    mockFetch.mockResolvedValue(
      respond(200, {
        applications: [
          {
            id: "member-1_job-1",
            userId: "member-1",
            postId: "job-1",
            status: "reviewing",
            resumeUrl: "https://storage.example/copy",
            resumeFileName: "cv.pdf",
            coverLetter: "Hello",
            references: "Elder Jane",
            profileSnapshot: { displayName: "Ada Bear", email: "" },
            appliedAt: "2026-09-02T00:00:00.000Z",
          },
        ],
        hasMore: false,
        nextCursor: null,
        profiles: { "member-1": { displayName: "Ada B.", email: "ada@example.ca", location: "Regina", headline: "Cook" } },
        jobs: { "job-1": { id: "job-1", title: "Cook" } },
      })
    );
    const { applications, nextCursor } = await listEmployerApplications();
    expect(nextCursor).toBeNull();
    expect(applications).toEqual([
      {
        id: "member-1_job-1",
        jobId: "job-1",
        jobTitle: "Cook",
        applicantId: "member-1",
        applicantName: "Ada Bear",
        applicantEmail: "ada@example.ca",
        applicantLocation: "Regina",
        applicantHeadline: "Cook",
        status: "reviewing",
        resumeUrl: "https://storage.example/copy",
        resumeFileName: "cv.pdf",
        coverLetter: "Hello",
        references: "Elder Jane",
        appliedAt: "2026-09-02T00:00:00.000Z",
        updatedAt: null,
      },
    ]);
  });

  it("reads every page and puts the newest application first", async () => {
    mockFetch
      .mockResolvedValueOnce(page([{ id: "a", appliedAt: "2026-09-01T00:00:00.000Z" }], "a"))
      .mockResolvedValueOnce(page([{ id: "b", appliedAt: "2026-09-03T00:00:00.000Z" }]));
    const applications = await listAllEmployerApplications();
    expect(applications.map((application) => application.id)).toEqual(["b", "a"]);
    expect(paths()).toEqual(["/api/employer/applications", "/api/employer/applications?cursor=a"]);
  });

  it("finds one application across pages, or null", async () => {
    mockFetch.mockResolvedValueOnce(page([{ id: "a" }], "a")).mockResolvedValueOnce(page([{ id: "b" }]));
    expect((await getEmployerApplication("b"))?.id).toBe("b");

    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(page([{ id: "a" }]));
    expect(await getEmployerApplication("missing")).toBeNull();
  });

  it("refuses team members who do not review applications with the website's message", async () => {
    mockFetch.mockResolvedValue(respond(403, { error: "Hiring manager access required" }));
    await expect(listEmployerApplications()).rejects.toMatchObject({ status: 403, message: "Hiring manager access required" });
  });

  it("updates a status through the employer API", async () => {
    mockFetch.mockResolvedValue(respond(200, { success: true }));
    await updateApplicationStatus("member-1_job-1", "interview");
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/employer/applications`,
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ appId: "member-1_job-1", status: "interview" }) })
    );
  });
});

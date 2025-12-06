import { JobPosting, EmployerProfile, Conference, Scholarship, ShopListing, PowwowEvent, LiveStreamEvent, MemberProfile } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

// Helper to create a fake timestamp
const now = new Date();
const createTimestamp = (date: Date) => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime(),
    isEqual: () => false,
    valueOf: () => date.getTime().toString(),
    toJSON: () => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }),
} as unknown as Timestamp);

export const MOCK_JOBS: JobPosting[] = [
    {
        id: "mock-job-1",
        employerId: "mock-employer-1",
        employerName: "Tech Forward Indigenous",
        title: "Senior Software Engineer",
        location: "Remote (Canada)",
        employmentType: "Full-time",
        remoteFlag: true,
        indigenousPreference: true,
        description: "We are looking for a Senior Software Engineer to join our team building digital solutions for Indigenous communities. You will work with a diverse team to create impactful software.",
        requirements: "5+ years of experience with React and Node.js.",
        salaryRange: { min: 120000, max: 160000, currency: "CAD", disclosed: true },
        createdAt: createTimestamp(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
        closingDate: createTimestamp(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
        active: true,
        viewsCount: 150,
        applicationsCount: 12,
    },
    {
        id: "mock-job-2",
        employerId: "mock-employer-2",
        employerName: "First Nations Health Authority",
        title: "Community Health Nurse",
        location: "Vancouver, BC",
        employmentType: "Full-time",
        remoteFlag: false,
        indigenousPreference: true,
        description: "Provide community health nursing services to First Nations communities. Travel required.",
        salaryRange: { min: 85000, max: 105000, currency: "CAD", disclosed: true },
        createdAt: createTimestamp(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
        closingDate: createTimestamp(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)),
        active: true,
        viewsCount: 89,
        applicationsCount: 5,
    },
    {
        id: "mock-job-3",
        employerId: "mock-employer-3",
        employerName: "Raven Capital Partners",
        title: "Investment Analyst",
        location: "Toronto, ON",
        employmentType: "Full-time",
        remoteFlag: true,
        indigenousPreference: false,
        description: "Analyze investment opportunities with a focus on Indigenous impact investing.",
        salaryRange: { min: 90000, max: 110000, currency: "CAD", disclosed: true },
        createdAt: createTimestamp(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)),
        active: true,
        viewsCount: 210,
        applicationsCount: 25,
    }
];

export const MOCK_EMPLOYERS: EmployerProfile[] = [
    {
        id: "mock-employer-1",
        userId: "user-1",
        organizationName: "Tech Forward Indigenous",
        description: "A technology company focused on digital equity.",
        location: "Ottawa, ON",
        website: "https://example.com",
        status: "approved",
        createdAt: createTimestamp(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)),
    },
    {
        id: "mock-employer-2",
        userId: "user-2",
        organizationName: "First Nations Health Authority",
        description: "Health and wellness for First Nations.",
        location: "West Vancouver, BC",
        status: "approved",
        createdAt: createTimestamp(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)),
    }
];

export const MOCK_CONFERENCES: Conference[] = [
    {
        id: "mock-conf-1",
        employerId: "mock-employer-1",
        title: "Indigenous Tech Summit 2025",
        description: "Bringing together Indigenous tech leaders and innovators.",
        location: "Vancouver, BC",
        startDate: createTimestamp(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)),
        endDate: createTimestamp(new Date(now.getTime() + 47 * 24 * 60 * 60 * 1000)),
        active: true,
        featured: true,
        bannerImageUrl: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2070&auto=format&fit=crop",
    }
];

export const MOCK_SCHOLARSHIPS: Scholarship[] = [
    {
        id: "mock-scholarship-1",
        employerId: "mock-employer-3",
        title: "Future Leaders Scholarship",
        provider: "Raven Capital",
        description: "Supporting the next generation of Indigenous business leaders.",
        amount: "$5,000",
        deadline: createTimestamp(new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)),
        level: "Undergraduate",
        type: "Business",
        active: true,
        createdAt: createTimestamp(now),
    }
];
export const MOCK_MEMBERS: MemberProfile[] = [
    {
        id: "mock-member-1",
        userId: "member-1",
        displayName: "Jordan Smith",
        location: "Toronto, ON",
        skills: ["React", "TypeScript", "Node.js", "Project Management"],
        availableForInterviews: "Immediately",
        resumeUrl: "https://example.com/resume.pdf",
        createdAt: createTimestamp(new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000)),
        updatedAt: createTimestamp(now),
    },
    {
        id: "mock-member-2",
        userId: "member-2",
        displayName: "Sarah Johnson",
        location: "Vancouver, BC",
        skills: ["Graphic Design", "UI/UX", "Figma", "Branding"],
        availableForInterviews: "Within 2 weeks",
        resumeUrl: "https://example.com/portfolio",
        createdAt: createTimestamp(new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000)),
        updatedAt: createTimestamp(now),
    },
    {
        id: "mock-member-3",
        userId: "member-3",
        displayName: "Mike Wilson",
        location: "Calgary, AB",
        skills: ["Welding", "Construction Safety", "Team Leadership"],
        availableForInterviews: "",
        createdAt: createTimestamp(new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000)),
        updatedAt: createTimestamp(now),
    }
];

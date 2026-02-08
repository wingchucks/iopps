"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
    getMemberProfile,
    listMemberApplications,
    getJobPosting,
    listMemberScholarshipApplications,
} from "@/lib/firestore";
import type {
    MemberProfile,
    JobApplication,
    JobPosting,
    ScholarshipApplication
} from "@/lib/types";

type ApplicationWithJob = JobApplication & { job?: JobPosting | null };

export default function PassportPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<MemberProfile | null>(null);
    const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
    const [scholarshipApplications, setScholarshipApplications] = useState<ScholarshipApplication[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
            return;
        }

        // Redirect employers to their organization dashboard
        if (!loading && user && role === "employer") {
            router.replace("/organization");
            return;
        }

        // Only load member data if we're sure the user is not an employer
        // Wait for role to be determined before loading data
        if (user && role && role !== "employer") {
            const loadData = async () => {
                try {
                    const [profileData, apps, scholarshipApps] = await Promise.all([
                        getMemberProfile(user.uid),
                        listMemberApplications(user.uid),
                        listMemberScholarshipApplications(user.uid),
                    ]);

                    setProfile(profileData);

                    // Fetch job details for applications
                    const appsWithJobs: ApplicationWithJob[] = [];
                    for (const app of apps) {
                        try {
                            const job = await getJobPosting(app.jobId);
                            appsWithJobs.push({ ...app, job });
                        } catch (e) {
                            appsWithJobs.push(app);
                        }
                    }
                    setApplications(appsWithJobs);
                    setScholarshipApplications(scholarshipApps);
                } catch (error) {
                    console.error("Error loading passport data:", error);
                } finally {
                    setDataLoading(false);
                }
            };
            loadData();
        }
    }, [user, role, loading, router]);


    // Calculate profile completeness
    const profileCompletion = useMemo(() => {
        if (!profile) return 0;
        const fields = [
            profile.displayName,
            profile.location,
            profile.skills && profile.skills.length > 0 ? "skills" : "",
            profile.experience && profile.experience.length > 0 ? "experience" : "",
            profile.education && profile.education.length > 0 ? "education" : "",
            profile.resumeUrl,
            profile.indigenousAffiliation,
            profile.messagingHandle,
            profile.availableForInterviews,
        ];
        const filled = fields.filter((field) => field && field.toString().trim().length > 0).length;
        return Math.round((filled / fields.length) * 100) || 0;
    }, [profile]);

    // Recent activity stats
    const recentStats = useMemo(() => {
        const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentApps = applications.filter((app) => {
            const date = app.createdAt;
            if (!date) return false;
            let timestamp: number;
            if (typeof date === 'object' && 'toDate' in date) {
                timestamp = date.toDate().getTime();
            } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const [year, month, day] = (date as string).split('-').map(Number);
                timestamp = new Date(year, month - 1, day).getTime();
            } else {
                timestamp = new Date(date).getTime();
            }
            return timestamp >= last30Days;
        });

        return {
            totalApplications: applications.length + scholarshipApplications.length,
            recentApplications: recentApps.length,
            profileCompletion,
        };
    }, [applications, scholarshipApplications, profileCompletion]);


    // Show loading while auth is loading, role is being determined, or data is being fetched
    // Also show loading if employer is being redirected (role === "employer")
    if (loading || !role || dataLoading || role === "employer") {
        return <div className="p-10 text-center text-foreground0">Loading Passport...</div>;
    }

    return (
        <div className="container max-w-4xl py-6 pb-24">
            <div className="px-4 mb-6">
                <h1 className="text-2xl font-bold text-white">My Passport</h1>
                <p className="text-[var(--text-muted)]">Your career journey and tools.</p>
            </div>

            {/* TODO: Passport content — old OverviewTab + MemberProfileView removed during dashboard cleanup */}
        </div>
    );
}

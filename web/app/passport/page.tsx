"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import OverviewTab, { ApplicationWithJob } from "../member/dashboard/OverviewTab";
import MemberProfileView from "../member/dashboard/MemberProfileView";
import {
    getMemberProfile,
    listMemberApplications,
    getJobPosting,
    listMemberScholarshipApplications,
    getUnreadMessageCount
} from "@/lib/firestore";
import type {
    MemberProfile,
    ScholarshipApplication
} from "@/lib/types";

export default function PassportPage() {
    const { user, loading } = useAuth();
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

        if (user) {
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
    }, [user, loading, router]);


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
            const timestamp = typeof date === 'object' && 'toDate' in date ? date.toDate().getTime() : new Date(date).getTime();
            return timestamp >= last30Days;
        });

        return {
            totalApplications: applications.length + scholarshipApplications.length,
            recentApplications: recentApps.length,
            profileCompletion,
        };
    }, [applications, scholarshipApplications, profileCompletion]);


    if (loading || dataLoading) return <div className="p-10 text-center text-slate-500">Loading Passport...</div>;

    return (
        <div className="container max-w-4xl py-6 pb-24">
            <div className="px-4 mb-6">
                <h1 className="text-2xl font-bold text-white">My Passport</h1>
                <p className="text-slate-400">Your career journey and tools.</p>
            </div>

            {/* <OverviewTab
                profile={profile}
                profileCompletion={profileCompletion}
                stats={recentStats}
                applications={applications}
                onNavigate={(tab) => {
                    // Start simple: just log or maybe redirect to full dashboard if needed
                    // For mobile MVP, maybe some tabs link to full pages?
                    if (tab === 'applications') router.push('/member/dashboard?tab=applications');
                    else if (tab === 'profile') router.push('/member/dashboard?tab=profile');
                    else console.log("Navigate to", tab);
                }}
            /> */}
            <MemberProfileView profile={profile} />
        </div>
    );
}

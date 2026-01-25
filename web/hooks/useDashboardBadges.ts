import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import {
    getUnreadMessagesQuery,
} from '@/lib/firestore/messaging';
import { getSavedJobsQuery } from '@/lib/firestore/jobs';
import { getSavedTrainingQuery } from '@/lib/firestore/training';
import { getOrganizationApplicationsQuery } from '@/lib/firestore/applications';
import { getStudentInquiriesQuery, getSchoolByEmployerId } from '@/lib/firestore/schools';
import { getMemberProfile } from '@/lib/firestore'; // fallback for saved scholarships
import { doc, db, memberCollection } from '@/lib/firestore/shared';

interface DashboardBadges {
    // Member
    savedJobs: number;
    savedScholarships: number;
    savedTraining: number;
    // Organization
    applications: number;
    inquiries: number;
    shopInquiries: number;
    // Shared
    messages: number;
}

const initialBadges: DashboardBadges = {
    savedJobs: 0,
    savedScholarships: 0,
    savedTraining: 0,
    applications: 0,
    inquiries: 0,
    shopInquiries: 0,
    messages: 0,
};

export function useDashboardBadges(user: any, role: 'member' | 'employer' | 'vendor' | null) {
    const [badges, setBadges] = useState<DashboardBadges>(initialBadges);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !role) {
            setLoading(false);
            return;
        }

        const unsubs: (() => void)[] = [];

        // Shared: Messages
        const msgQuery = getUnreadMessagesQuery(user.uid, role === 'member' ? 'member' : 'employer');
        const msgUnsub = onSnapshot(msgQuery, (snap) => {
            // Sum unread counts from all active conversations
            let count = 0;
            snap.docs.forEach(d => {
                const data = d.data();
                const unread = role === 'employer' ? data.employerUnreadCount : data.memberUnreadCount;
                count += (unread || 0);
            });
            setBadges(prev => ({ ...prev, messages: count }));
        }, (err) => {
            console.error("Error listening to messages:", err);
        });
        unsubs.push(msgUnsub);

        if (role === 'member') {
            // 1. Saved Jobs
            const jobsUnsub = onSnapshot(getSavedJobsQuery(user.uid), (snap) => {
                setBadges(prev => ({ ...prev, savedJobs: snap.size }));
            });
            unsubs.push(jobsUnsub);

            // 2. Saved Training
            const trainingUnsub = onSnapshot(getSavedTrainingQuery(user.uid), (snap) => {
                setBadges(prev => ({ ...prev, savedTraining: snap.size }));
            });
            unsubs.push(trainingUnsub);

            // 3. Saved Scholarships (Listen to Profile field 'savedScholarshipIds')
            // Note: If we had a collection, we'd query it. Since it's on profile, listen to profile doc.
            const profileRef = doc(db!, memberCollection, user.uid);
            // We assume getMemberProfile uses 'memberProfiles' collection and docId is uid.
            // Let's verify standard member profile path. In members.ts: upsertMemberProfile uses 'memberProfiles' collection with user.uid
            const scholarshipsUnsub = onSnapshot(profileRef, (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const count = data.savedScholarshipIds?.length || 0;
                    setBadges(prev => ({ ...prev, savedScholarships: count }));
                }
            });
            unsubs.push(scholarshipsUnsub);
        }

        if (role === 'employer') {
            // 1. Applications
            const appsUnsub = onSnapshot(getOrganizationApplicationsQuery(user.uid), (snap) => {
                setBadges(prev => ({ ...prev, applications: snap.size }));
            });
            unsubs.push(appsUnsub);

            // 2. Student Inquiries
            // Need schoolId first. This is async, so we wrap it.
            const setupInquiries = async () => {
                try {
                    const school = await getSchoolByEmployerId(user.uid);
                    if (school) {
                        const inqUnsub = onSnapshot(getStudentInquiriesQuery(school.id), (snap) => {
                            setBadges(prev => ({ ...prev, inquiries: snap.size }));
                        });
                        unsubs.push(inqUnsub);
                    }
                } catch (e) {
                    console.error("Error setting up inquiry listener", e);
                }
            };
            setupInquiries();
            // Note: shopInquiries logic would go here if vendor logic was separated or mixed
        }

        setLoading(false);

        return () => {
            unsubs.forEach(u => u());
        };
    }, [user, role]);

    return { badges, loading };
}

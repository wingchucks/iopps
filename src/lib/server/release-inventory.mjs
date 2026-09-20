// Read-only projected inventory. Aggregate counts and minimal owner review references;
// never applicant contact information, resumes or application content.
const PROFILE_FIELDS = ['role', 'orgId', 'employerId', 'orgRole', 'status', 'deletedAt', 'claimsValidAfter'];
const REVIEW_FIELDS = ['directoryReview.status', 'directoryReview.revision', 'directoryReview.approvedRevision'];
export const AUDIT_FIELDS = Object.freeze({
  users: PROFILE_FIELDS,
  members: ['role', 'orgId', 'orgRole'],
  organizations: ['name', 'employerId', 'status', 'disabled', 'deletedAt', ...REVIEW_FIELDS],
  employers: ['name', 'organizationName', 'status', 'disabled', 'deletedAt', ...REVIEW_FIELDS],
  events: ['slug', 'status', 'active', 'orgId', 'employerId'],
  scholarships: ['slug', 'status', 'active', 'orgId', 'employerId'],
  posts: ['title', 'type', 'slug', 'status', 'active', 'orgId', 'employerId'],
  jobs: ['title', 'status', 'active', 'orgId', 'employerId'],
  applications: ['userId', 'memberId', 'postId', 'jobId', 'orgId', 'employerId', 'status', 'appliedAt'],
  organizationOpportunityDrafts: ['kind', 'id', 'orgId', 'status', 'revision'],
});


const text = value => typeof value === 'string' ? value.trim() : '';
const status = data => text(data.status).toLowerCase();
const blockedUser = data => ['suspended', 'deleted', 'disabled'].includes(status(data)) || data.deletedAt != null;
const hiddenOpportunity = data => data.active === false || (Boolean(data.status) && !['active', 'published'].includes(String(data.status).toLowerCase()));

export async function scanCollection(db, FieldPath, name, maximum) {
  const rows = new Map();
  let cursor;
  while (rows.size < maximum) {
    const pageSize = Math.min(200, maximum - rows.size);
    let query = db.collection(name).select(...AUDIT_FIELDS[name]).orderBy(FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const document of page.docs) rows.set(document.id, document.data());
    if (page.size < pageSize) return { rows, complete: true };
    cursor = page.docs.at(-1);
  }
  // Do not read beyond the stated cap. Exactly hitting it is conservatively incomplete.
  return { rows, complete: false };
}

function reviewCounts(rows) {
  const counts = { checked: rows.size, missingStatusLegacyOrMalformed: 0, malformedStatusOrRevision: 0, approvedRevisionMismatch: 0, approved: 0, awaitingApproval: 0 };
  for (const data of rows.values()) {
    const review = data.directoryReview;
    if (!review || review.status === undefined) { counts.missingStatusLegacyOrMalformed++; continue; }
    if (!['draft', 'pending', 'changes_requested', 'approved', 'rejected'].includes(review.status) || !Number.isSafeInteger(review.revision) || review.revision < 1) counts.malformedStatusOrRevision++;
    else if (review.status === 'approved' && review.approvedRevision !== review.revision) counts.approvedRevisionMismatch++;
    else if (review.status === 'approved') counts.approved++;
    else counts.awaitingApproval++;
  }
  return counts;
}

/** @param {Record<string, {rows: Map<string, Record<string, unknown>>, complete: boolean}>} scans */
export function summarizeCollections(scans) {
  const { users, members, organizations, employers, events, scholarships, posts } = scans;
  const usersReport = { checked: users.rows.size, blockedRecords: 0, reauthenticationBoundaryPresent: 0, organizationRoleWithoutExplicitLink: 0, conflictingUserAndMemberOrgLinks: 0, organizationEmployerLinkDisagreement: 0, linkedNonSelfWithoutManagementRole: 0, missingMatchingMemberLinkForClientRules: 0, resolvedOrganizationAbsentFromScannedTargets: 0, linkedBlockedTargets: 0 };
  const allTargetsRead = organizations.complete && employers.complete;
  const activeAccess = { checked: 0, missingMemberLinkForDifferentOrganization: 0, ownerWithoutMemberLink: 0, targetAbsent: 0, linkedNonSelfWithoutManagementRole: 0 };
  for (const [uid, user] of users.rows) {
    const member = members.rows.get(uid) || {};
    if (blockedUser(user)) usersReport.blockedRecords++;
    if (typeof user.claimsValidAfter === 'number') usersReport.reauthenticationBoundaryPresent++;
    if (text(user.orgId) && text(member.orgId) && user.orgId !== member.orgId) usersReport.conflictingUserAndMemberOrgLinks++;
    const linkedId = text(member.orgId) || text(user.orgId) || text(user.employerId);
    const organizationRole = ['employer', 'school', 'organization'].includes(user.role) || ['employer', 'school', 'organization'].includes(member.role);
    if (!linkedId && organizationRole) usersReport.organizationRoleWithoutExplicitLink++;
    const orgId = linkedId || (organizationRole ? uid : '');
    const employerId = text(user.employerId) || text(user.orgId) || text(member.orgId) || (organizationRole ? uid : '');
    if (!orgId) continue;
    const role = text(member.orgRole) || text(user.orgRole) || (orgId === uid || employerId === uid ? 'owner' : 'member');
    if (orgId !== uid && !['owner', 'admin'].includes(role)) usersReport.linkedNonSelfWithoutManagementRole++;
    if (text(member.orgId) !== orgId) usersReport.missingMatchingMemberLinkForClientRules++;
    if (!organizations.rows.has(orgId) && !employers.rows.has(employerId) && !employers.rows.has(orgId)) usersReport.resolvedOrganizationAbsentFromScannedTargets++;
    const organization = organizations.rows.get(orgId) || {};
    if (text(organization.employerId) && organization.employerId !== employerId) usersReport.organizationEmployerLinkDisagreement++;
    const employer = employers.rows.get(employerId) || employers.rows.get(orgId) || {};
    if ([organization, employer].some(data => data.disabled === true || data.deletedAt != null || ['disabled', 'deleted', 'archived'].includes(status(data)))) usersReport.linkedBlockedTargets++;
    const blockedTarget = [organization, employer].some(data => data.disabled === true || data.deletedAt != null || ['disabled', 'deleted', 'archived'].includes(status(data)));
    if (!blockedUser(user) && !blockedTarget) {
      activeAccess.checked++;
      if (!organizations.rows.has(orgId) && !employers.rows.has(employerId) && !employers.rows.has(orgId)) activeAccess.targetAbsent++;
      if (text(member.orgId) !== orgId) {
        if (orgId === uid) activeAccess.ownerWithoutMemberLink++;
        else activeAccess.missingMemberLinkForDifferentOrganization++;
      }
      if (orgId !== uid && !['owner', 'admin'].includes(role)) activeAccess.linkedNonSelfWithoutManagementRole++;
    }
  }
  const opportunities = {};
  for (const [kind, canonical] of [['events', events], ['scholarships', scholarships]]) {
    const type = kind === 'events' ? 'event' : 'scholarship';
    const aliases = (id, data) => [id, data.slug].filter(Boolean).map(value => String(value).replace(new RegExp(`^${type}-`), ''));
    const reserved = new Map();
    const counts = { checked: canonical.rows.size, hiddenStatusOrInactive: 0, statusMissingAndNotExplicitlyInactive: 0, missingOwnershipLink: 0, conflictingOwnershipLinks: 0, legacyPostsChecked: 0, legacyWithoutMatchingCanonicalAlias: 0, legacyAliasMatchesHiddenCanonical: 0 };
    for (const [id, data] of canonical.rows) {
      for (const alias of aliases(id, data)) reserved.set(alias, [...(reserved.get(alias) || []), data]);
      if (hiddenOpportunity(data)) counts.hiddenStatusOrInactive++;
      else if (!data.status) counts.statusMissingAndNotExplicitlyInactive++;
      if (!text(data.orgId) && !text(data.employerId)) counts.missingOwnershipLink++;
      if (text(data.orgId) && text(data.employerId) && data.orgId !== data.employerId) counts.conflictingOwnershipLinks++;
    }
    for (const [id, data] of posts.rows) {
      if (data.type !== type) continue;
      counts.legacyPostsChecked++;
      const matches = aliases(id, data).flatMap(alias => reserved.get(alias) || []);
      if (!matches.length) counts.legacyWithoutMatchingCanonicalAlias++;
      else if (matches.some(hiddenOpportunity)) counts.legacyAliasMatchesHiddenCanonical++;
    }
    opportunities[kind] = counts;
  }
  const applications = { checked: 0, missingCurrentOwner: 0, legacyOwnerOnly: 0, conflictingOwnerFields: 0, missingCurrentJobLink: 0, missingAppliedAt: 0, unknownStatus: 0, missingOrganizationLink: 0, jobAbsentFromScannedTargets: 0, missingOrgWithCanonicalJobOwner: 0, missingOrgWithoutCanonicalJobOwner: 0 };
  for (const app of scans.applications.rows.values()) {
    applications.checked++;
    if (!text(app.userId)) applications.missingCurrentOwner++;
    if (!text(app.userId) && text(app.memberId)) applications.legacyOwnerOnly++;
    if (text(app.userId) && text(app.memberId) && app.userId !== app.memberId) applications.conflictingOwnerFields++;
    if (!text(app.postId)) applications.missingCurrentJobLink++;
    if (app.appliedAt == null) applications.missingAppliedAt++;
    if (!['submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn'].includes(app.status)) applications.unknownStatus++;
    if (!text(app.orgId) && !text(app.employerId)) applications.missingOrganizationLink++;
    const id = text(app.postId) || text(app.jobId);
    if (!id || (!scans.jobs.rows.has(id) && !posts.rows.has(id))) applications.jobAbsentFromScannedTargets++;
    if (!text(app.orgId) && !text(app.employerId)) {
      const target = scans.jobs.rows.get(id) || posts.rows.get(id) || {};
      if (text(target.orgId) || text(target.employerId)) applications.missingOrgWithCanonicalJobOwner++;
      else applications.missingOrgWithoutCanonicalJobOwner++;
    }
  }
  const jobs = { checked: scans.jobs.rows.size, missingOrganizationLink: 0, hiddenStatusOrInactive: 0 };
  for (const job of scans.jobs.rows.values()) {
    if (!text(job.orgId) && !text(job.employerId)) jobs.missingOrganizationLink++;
    if (hiddenOpportunity(job)) jobs.hiddenStatusOrInactive++;
  }
  return {
    scans: Object.fromEntries(Object.entries(scans).map(([name, scan]) => [name, { documentsRead: scan.rows.size, complete: scan.complete }])),
    users: { ...usersReport, memberJoinComplete: members.complete, organizationTargetScanComplete: allTargetsRead },
    activeOrganizationAccess: activeAccess,
    organizationReview: reviewCounts(organizations.rows), employerReview: reviewCounts(employers.rows), opportunities,
    posts: { checked: posts.rows.size, hiddenStatusOrInactive: [...posts.rows.values()].filter(hiddenOpportunity).length },
    jobs,
    applications: { ...applications, jobTargetScanComplete: scans.jobs.complete && posts.complete },
    privateOpportunities: { checked: scans.organizationOpportunityDrafts.rows.size },
  };
}

// Only the owner-authorized route exposes these minimal review references.
// A current job owner is a candidate, never proof of historical application ownership.
export function buildReviewReferences(scans) {
  const applications = [];
  for (const [id, app] of scans.applications.rows) {
    if (text(app.orgId) || text(app.employerId)) continue;
    const jobId = text(app.postId) || text(app.jobId);
    const job = scans.jobs.rows.get(jobId) || scans.posts.rows.get(jobId);
    const candidateOrgId = text(job?.orgId) || text(job?.employerId);
    const org = scans.organizations.rows.get(candidateOrgId) || scans.employers.rows.get(candidateOrgId);
    applications.push({
      applicationId: id,
      jobId,
      jobTitle: text(job?.title).slice(0, 200),
      candidateOrgId: candidateOrgId || null,
      candidateName: text(org?.name || org?.organizationName).slice(0, 200),
      candidateTargetPresent: Boolean(org),
      reviewRequired: true,
      reason: candidateOrgId ? 'Current job ownership found; confirm historical ownership before assigning access.' : 'No current job ownership found. Preserve applicant history; do not guess an employer.',
    });
  }
  const missingOrganizationTargets = [];
  for (const [uid, user] of scans.users.rows) {
    if (blockedUser(user)) continue;
    const member = scans.members.rows.get(uid) || {};
    const organizationRole = ['employer', 'school', 'organization'].includes(user.role) || ['employer', 'school', 'organization'].includes(member.role);
    const orgId = text(member.orgId) || text(user.orgId) || text(user.employerId) || (organizationRole ? uid : '');
    const employerId = text(user.employerId) || text(user.orgId) || text(member.orgId) || (organizationRole ? uid : '');
    if (orgId && !scans.organizations.rows.has(orgId) && !scans.employers.rows.has(employerId) && !scans.employers.rows.has(orgId)) {
      missingOrganizationTargets.push({ userId: uid, orgId, employerId, reviewRequired: true });
    }
  }
  return { applications, missingOrganizationTargets, complete: Object.values(scans).every(scan => scan.complete), automaticRepairsAllowed: false };
}

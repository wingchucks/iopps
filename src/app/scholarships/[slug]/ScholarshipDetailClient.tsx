"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ReportButton from "@/components/ReportButton";
import { useAuth } from "@/lib/auth-context";
import { getPost, getPosts } from "@/lib/firestore/posts";
import { getOrganization, type Organization } from "@/lib/firestore/organizations";
import { savePost, unsavePost, isPostSaved } from "@/lib/firestore/savedItems";
import { getScholarshipBySlug, getScholarships, type Scholarship } from "@/lib/firestore/scholarships";
import { displayAmount, displayLocation } from "@/lib/utils";

interface ScholarshipOwnerMeta {
  ownerType?: "school" | "business" | "organization" | "unknown";
  ownerSlug?: string;
  ownerName?: string;
  isPartner?: boolean;
  partnerTier?: "standard" | "premium" | "school";
  partnerLabel?: string;
  partnerBadgeLabel?: string;
}

function isClosingSoon(deadline?: string): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  const diff = d.getTime() - Date.now();
  return diff > 0 && diff < 14 * 24 * 60 * 60 * 1000;
}

function getSourceLabel(ownerType?: ScholarshipOwnerMeta["ownerType"]) {
  switch (ownerType) {
    case "school":
      return "School Scholarship";
    case "business":
      return "Employer Scholarship";
    case "organization":
      return "Organization Scholarship";
    default:
      return "Scholarship";
  }
}

export default function ScholarshipDetailClient() {
  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <ScholarshipDetailContent />
      </div>
    </AppShell>
  );
}

function ScholarshipDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [related, setRelated] = useState<Scholarship[]>([]);
  const [ownerMeta, setOwnerMeta] = useState<ScholarshipOwnerMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        let data = await getScholarshipBySlug(slug);

        if (!data) {
          const post = await getPost(`scholarship-${slug}`);
          if (post) {
            data = {
              id: post.id,
              title: post.title,
              slug: post.slug || slug,
              description: post.description,
              eligibility: post.eligibility,
              amount: post.amount,
              deadline: post.deadline,
              orgId: post.orgId,
              orgName: post.orgName,
              orgShort: post.orgShort,
              applicationUrl: post.applicationUrl,
              requirements: post.requirements,
              location: post.location,
              featured: post.featured,
              badges: post.badges,
              source: post.source,
            };
          }
        }

        setScholarship(data);
        if (data?.orgId) {
          const orgData = await getOrganization(data.orgId);
          setOrg(orgData);
        }
        const publicScholarshipsRes = await fetch("/api/scholarships").catch(() => null);
        if (publicScholarshipsRes?.ok) {
          const payload = await publicScholarshipsRes.json() as { scholarships?: Array<Record<string, unknown>> };
          const normalized = (payload.scholarships || []).find((item) =>
            String(item.slug || item.id || "") === slug || String(item.id || "") === data?.id,
          );
          if (normalized) {
            setOwnerMeta({
              ownerType: normalized.ownerType as ScholarshipOwnerMeta["ownerType"],
              ownerSlug: typeof normalized.ownerSlug === "string" ? normalized.ownerSlug : undefined,
              ownerName: typeof normalized.ownerName === "string" ? normalized.ownerName : undefined,
              isPartner: Boolean(normalized.isPartner),
              partnerTier: typeof normalized.partnerTier === "string" ? normalized.partnerTier as ScholarshipOwnerMeta["partnerTier"] : undefined,
              partnerLabel: typeof normalized.partnerLabel === "string" ? normalized.partnerLabel : undefined,
              partnerBadgeLabel: typeof normalized.partnerBadgeLabel === "string" ? normalized.partnerBadgeLabel : undefined,
            });
          }
        }
        if (data && user) {
          const isSaved = await isPostSaved(user.uid, data.id);
          setSaved(isSaved);
        }

        let allScholarships = await getScholarships();
        if (allScholarships.length === 0) {
          const posts = await getPosts({ type: "scholarship", max: 10 });
          allScholarships = posts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug || p.id.replace(/^scholarship-/, ""),
            orgName: p.orgName,
            amount: p.amount,
            deadline: p.deadline,
          }));
        }
        setRelated(allScholarships.filter((s) => s.id !== data?.id).slice(0, 3));
      } catch (err) {
        console.error("Failed to load scholarship:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, user]);

  const handleSave = async () => {
    if (!user || !scholarship) return;
    setActionLoading("save");
    try {
      if (saved) {
        await unsavePost(user.uid, scholarship.id);
        setSaved(false);
      } else {
        await savePost(user.uid, scholarship.id, scholarship.title, "scholarship");
        setSaved(true);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-[180px] rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="skeleton h-[150px] rounded-2xl mb-6" />
            <div className="skeleton h-[100px] rounded-2xl" />
          </div>
          <div>
            <div className="skeleton h-[280px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!scholarship) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">&#127891;</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Scholarship Not Found</h2>
        <p className="text-text-sec mb-6">This scholarship doesn&apos;t exist or may have been removed.</p>
        <Link href="/scholarships">
          <Button primary>Browse Scholarships &#8594;</Button>
        </Link>
      </div>
    );
  }

  const ownerHref = ownerMeta?.ownerSlug ? (ownerMeta.ownerType === "school" ? `/schools/${ownerMeta.ownerSlug}` : `/org/${ownerMeta.ownerSlug}`) : (org ? `/org/${org.id}` : "#");
  const ownerName = ownerMeta?.ownerName || scholarship.orgName || org?.name || "";
  const sourceLabel = getSourceLabel(ownerMeta?.ownerType || (org?.type === "school" ? "school" : undefined));
  const orgLink = ownerHref;
  const isPremium = org?.tier === "premium";
  const closingSoon = isClosingSoon(scholarship.deadline);
  const amountLabel = displayAmount(scholarship.amount) || "Funding varies";
  const descriptionHasHtml = typeof scholarship.description === "string" && scholarship.description.includes("<");
  const eligibilityHasHtml = typeof scholarship.eligibility === "string" && scholarship.eligibility.includes("<");
  const applicationInstructionsHasHtml =
    typeof scholarship.applicationInstructions === "string" &&
    scholarship.applicationInstructions.includes("<");

  const scholarshipFacts = [
    { label: "Education Level", value: scholarship.educationLevel },
    { label: "Number of Awards", value: scholarship.numberOfAwards },
    { label: "GPA Required", value: scholarship.gpaRequired },
    { label: "Renewable", value: scholarship.renewable },
    { label: "Indigenous-Specific", value: scholarship.indigenousSpecific },
    { label: "Financial Need", value: scholarship.financialNeed },
    { label: "Business Stage", value: scholarship.businessStage },
    { label: "Max Funding", value: scholarship.maxFundingPerApplicant },
    { label: "Project Duration", value: scholarship.projectDuration },
    { label: "Reporting Required", value: scholarship.reportingRequired },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <Link
        href="/scholarships"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        &#8592; Back to Scholarships
      </Link>

      <div
        className="rounded-2xl mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(5,150,105,.06), rgba(13,148,136,.08))",
          padding: "clamp(24px, 4vw, 48px)",
        }}
      >
        <div className="text-center">
          <span className="text-6xl sm:text-7xl block mb-4">&#127891;</span>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            <Badge text={sourceLabel} color="var(--green)" bg="var(--green-soft)" small />
            {ownerMeta?.isPartner && (
              <Badge
                text={ownerMeta.partnerBadgeLabel || ownerMeta.partnerLabel || "Partner"}
                color={ownerMeta.partnerTier === "premium" ? "var(--gold)" : ownerMeta.partnerTier === "school" ? "var(--blue)" : "var(--teal)"}
                bg={ownerMeta.partnerTier === "premium" ? "var(--gold-soft)" : ownerMeta.partnerTier === "school" ? "var(--blue-soft)" : "var(--teal-soft)"}
                small
              />
            )}
            {scholarship.featured && (
              <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
            )}
            {closingSoon && <Badge text="Closing Soon" color="var(--red)" bg="var(--red-soft)" small />}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-text mb-2">{scholarship.title}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-text-sec">
            {scholarship.orgName && <span>{scholarship.orgName}</span>}
            <span>&#128176; {amountLabel}</span>
            <span>&#128197; {scholarship.deadline ? `Deadline: ${scholarship.deadline}` : "Check provider for deadline"}</span>
            {scholarship.location && <span>&#128205; {displayLocation(scholarship.location)}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {(org || ownerName) && (
            <div className="flex items-center gap-3 mb-6">
              <Avatar
                name={scholarship.orgShort || org?.shortName || ownerName}
                size={40}
                gradient={isPremium ? "linear-gradient(135deg, var(--navy), var(--teal))" : undefined}
              />
              <div>
                <Link href={orgLink} className="text-[15px] text-teal font-bold no-underline hover:underline">
                  {ownerName}
                </Link>
                <p className="m-0 text-[11px] text-text-muted">{sourceLabel}</p>
                {isPremium && (
                  <div className="flex items-center gap-1.5">
                    <Badge text="&#10003; Premium Partner" color="var(--gold)" bg="var(--gold-soft)" small />
                  </div>
                )}
              </div>
            </div>
          )}

          {scholarship.description && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About This Scholarship</h3>
              {descriptionHasHtml ? (
                <div
                  className="text-sm text-text-sec leading-relaxed mb-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: scholarship.description }}
                />
              ) : (
                <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                  {scholarship.description}
                </p>
              )}
            </>
          )}

          {scholarship.eligibility && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Eligibility</h3>
              {eligibilityHasHtml ? (
                <div
                  className="text-sm text-text-sec leading-relaxed mb-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: scholarship.eligibility }}
                />
              ) : (
                <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                  {scholarship.eligibility}
                </p>
              )}
            </>
          )}

          {scholarship.applicationInstructions && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Application Instructions</h3>
              {applicationInstructionsHasHtml ? (
                <div
                  className="text-sm text-text-sec leading-relaxed mb-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: scholarship.applicationInstructions }}
                />
              ) : (
                <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                  {scholarship.applicationInstructions}
                </p>
              )}
            </>
          )}

          {scholarship.requirements && scholarship.requirements.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Requirements</h3>
              <ul className="mb-6 pl-0 list-none">
                {scholarship.requirements.map((r, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-teal text-sm mt-0.5">&#10003;</span>
                    <span className="text-sm text-text-sec">{r}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {(scholarshipFacts.length > 0
            || (scholarship.fieldOfStudy && scholarship.fieldOfStudy.length > 0)
            || (scholarship.priorityGroups && scholarship.priorityGroups.length > 0)
            || (scholarship.industrySector && scholarship.industrySector.length > 0)
            || (scholarship.fundingUse && scholarship.fundingUse.length > 0)
            || (scholarship.projectType && scholarship.projectType.length > 0)
            || (scholarship.applicantType && scholarship.applicantType.length > 0)) && (
            <>
              <h3 className="text-lg font-bold text-text mb-3">Eligibility & Award Details</h3>
              {scholarshipFacts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {scholarshipFacts.map((fact) => (
                    <Card key={fact.label}>
                      <div style={{ padding: 14 }}>
                        <p className="text-xs font-bold text-text-muted mb-1 tracking-[0.08em] uppercase">{fact.label}</p>
                        <p className="text-sm text-text m-0">{fact.value}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 mb-6">
                {scholarship.fieldOfStudy && scholarship.fieldOfStudy.length > 0 && (
                  <Card>
                    <div style={{ padding: 14 }}>
                      <p className="text-xs font-bold text-text-muted mb-2 tracking-[0.08em] uppercase">Field of Study</p>
                      <p className="text-sm text-text-sec m-0">{scholarship.fieldOfStudy.join(", ")}</p>
                    </div>
                  </Card>
                )}
                {scholarship.priorityGroups && scholarship.priorityGroups.length > 0 && (
                  <Card>
                    <div style={{ padding: 14 }}>
                      <p className="text-xs font-bold text-text-muted mb-2 tracking-[0.08em] uppercase">Priority Groups</p>
                      <p className="text-sm text-text-sec m-0">{scholarship.priorityGroups.join(", ")}</p>
                    </div>
                  </Card>
                )}
                {scholarship.industrySector && scholarship.industrySector.length > 0 && (
                  <Card>
                    <div style={{ padding: 14 }}>
                      <p className="text-xs font-bold text-text-muted mb-2 tracking-[0.08em] uppercase">Industry Sector</p>
                      <p className="text-sm text-text-sec m-0">{scholarship.industrySector.join(", ")}</p>
                    </div>
                  </Card>
                )}
                {scholarship.fundingUse && scholarship.fundingUse.length > 0 && (
                  <Card>
                    <div style={{ padding: 14 }}>
                      <p className="text-xs font-bold text-text-muted mb-2 tracking-[0.08em] uppercase">Eligible Funding Use</p>
                      <p className="text-sm text-text-sec m-0">{scholarship.fundingUse.join(", ")}</p>
                    </div>
                  </Card>
                )}
                {scholarship.projectType && scholarship.projectType.length > 0 && (
                  <Card>
                    <div style={{ padding: 14 }}>
                      <p className="text-xs font-bold text-text-muted mb-2 tracking-[0.08em] uppercase">Project Type</p>
                      <p className="text-sm text-text-sec m-0">{scholarship.projectType.join(", ")}</p>
                    </div>
                  </Card>
                )}
                {scholarship.applicantType && scholarship.applicantType.length > 0 && (
                  <Card>
                    <div style={{ padding: 14 }}>
                      <p className="text-xs font-bold text-text-muted mb-2 tracking-[0.08em] uppercase">Applicant Type</p>
                      <p className="text-sm text-text-sec m-0">{scholarship.applicantType.join(", ")}</p>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}

          {scholarship.applicationUrl && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">How to Apply</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6">
                Apply directly through the organization&apos;s application portal using the button in the sidebar.
              </p>
            </>
          )}

          {(scholarship.contactEmail || scholarship.contactPhone) && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Contact</h3>
              <div className="flex flex-col gap-1 mb-6">
                {scholarship.contactEmail && <p className="text-sm text-text-sec m-0">Email: {scholarship.contactEmail}</p>}
                {scholarship.contactPhone && <p className="text-sm text-text-sec m-0">Phone: {scholarship.contactPhone}</p>}
              </div>
            </>
          )}

          {org && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About {org.shortName}</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6">{org.description}</p>
            </>
          )}

          {scholarship.badges && scholarship.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {scholarship.badges.map((b) => (
                <span
                  key={b}
                  className="rounded-xl text-[13px] font-semibold text-teal"
                  style={{
                    padding: "8px 14px",
                    background: "rgba(13,148,136,.06)",
                    border: "1.5px solid rgba(13,148,136,.1)",
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-3">Related Scholarships</h3>
              <div className="flex flex-col gap-2 mb-6">
                {related.map((r) => {
                  const rSlug = r.slug || r.id;
                  return (
                    <Link key={r.id} href={`/scholarships/${rSlug}`} className="no-underline">
                      <Card className="cursor-pointer">
                        <div className="flex gap-3 items-center" style={{ padding: "14px 16px" }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge text="Scholarship" color="var(--green)" bg="var(--green-soft)" small />
                            </div>
                            <h4 className="text-sm font-bold text-text m-0 mb-0.5">{r.title}</h4>
                            <div className="flex flex-wrap gap-2 text-xs text-text-sec">
                              {r.orgName && <span>{r.orgName}</span>}
                              {displayAmount(r.amount) && <span>&#128176; {displayAmount(r.amount)}</span>}
                              {r.deadline && <span>&#128197; {r.deadline}</span>}
                            </div>
                          </div>
                          <span className="text-text-muted">&#8250;</span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div>
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              {scholarship.applicationUrl ? (
                <a href={scholarship.applicationUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
                  <Button
                    primary
                    full
                    style={{
                      background: "var(--green)",
                      padding: "14px 24px",
                      borderRadius: 14,
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 12,
                    }}
                  >
                    Apply Now &#8594;
                  </Button>
                </a>
              ) : (
                <Button
                  primary
                  full
                  style={{
                    background: "var(--teal)",
                    padding: "14px 24px",
                    borderRadius: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 12,
                    opacity: 0.6,
                    cursor: "default",
                  }}
                >
                  Application Details TBD
                </Button>
              )}
              <Button
                full
                onClick={handleSave}
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 16,
                  opacity: actionLoading === "save" ? 0.7 : 1,
                }}
              >
                {saved ? "&#10004; Saved" : "&#128278; Save Scholarship"}
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">SCHOLARSHIP DETAILS</p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Value</span>
                    <span className="text-xs font-semibold text-text">{amountLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Deadline</span>
                    <span className="text-xs font-semibold text-text">{scholarship.deadline || "Check provider site"}</span>
                  </div>
                  {scholarship.location && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Location</span>
                      <span className="text-xs font-semibold text-text">{displayLocation(scholarship.location)}</span>
                    </div>
                  )}
                  {scholarship.orgName && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Awarded by</span>
                      <span className="text-xs font-semibold text-text">{ownerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-text-muted">Source</span>
                    <span className="text-xs font-semibold text-text">{sourceLabel}</span>
                  </div>
                  {scholarship.source && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Original feed</span>
                      <span className="text-xs font-semibold text-text">{scholarship.source}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {(org || ownerName) && (
            <Card>
              <div style={{ padding: 16 }}>
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">ABOUT THE ORGANIZATION</p>
                <div className="flex gap-2.5 items-center mb-2.5">
                  <Avatar
                    name={org?.shortName || ownerName}
                    size={36}
                    gradient={isPremium ? "linear-gradient(135deg, var(--navy), var(--teal))" : undefined}
                  />
                  <div>
                    <p className="text-sm font-bold text-text m-0">{org?.shortName || ownerName}</p>
                    <p className="text-[11px] text-text-muted m-0">
                      {org ? (
                        <>
                          {org.openJobs} open roles
                          {org.employees && <> &bull; {org.employees} employees</>}
                        </>
                      ) : (
                        sourceLabel
                      )}
                    </p>
                  </div>
                </div>
                {org?.description && (
                  <p className="text-xs text-text-sec leading-relaxed mb-3">
                    {(org.description || "").length > 120 ? `${(org.description || "").slice(0, 120)}...` : org.description}
                  </p>
                )}
                <Link href={orgLink} className="text-xs text-teal font-semibold no-underline hover:underline">
                  {ownerMeta?.ownerType === "school" ? "View School Profile" : "View Organization Profile"} &#8594;
                </Link>
              </div>
            </Card>
          )}

          <div className="mt-3 text-center">
            <ReportButton
              targetType="post"
              targetId={scholarship.id}
              targetTitle={scholarship.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

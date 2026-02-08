/**
 * IOPPS Careers Page — Social Feed Pattern
 *
 * Jobs + Training programs displayed through the unified feed layout.
 */

import {
  FeedLayout,
  OpportunityFeed,
  SectionHeader,
  SidebarLinkCard,
  SidebarCTACard,
  colors,
} from "@/components/opportunity-graph";
import { CAREERS_SIDEBAR_LINKS } from "@/lib/constants/navigation";

function CareersRightSidebar() {
  return (
    <>
      <SidebarLinkCard
        title="Career Tools"
        icon="briefcase"
        links={CAREERS_SIDEBAR_LINKS}
      />
      <SidebarCTACard
        title="Are you an employer?"
        description="Post jobs and connect with Indigenous talent across Canada."
        buttonLabel="Post a Job"
        buttonHref="/organization/jobs/new"
        gradient={`linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDk} 100%)`}
        buttonTextColor={colors.accent}
      />
    </>
  );
}

export default function CareersPage() {
  return (
    <FeedLayout activeNav="careers" rightSidebar={<CareersRightSidebar />}>
      <SectionHeader
        title="Careers"
        subtitle="Discover jobs and training programs from employers committed to Indigenous hiring."
        icon="💼"
      />
      <OpportunityFeed
        contentTypes={["job", "program"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={30}
        emptyMessage="No career opportunities found right now. Check back soon!"
      />
    </FeedLayout>
  );
}

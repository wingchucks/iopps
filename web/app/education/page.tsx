/**
 * IOPPS Education Page — Social Feed Pattern
 *
 * Scholarships + Training programs displayed through the unified feed layout.
 */

"use client";

import {
  FeedLayout,
  OpportunityFeed,
  SectionHeader,
  SidebarLinkCard,
  SidebarCTACard,
  colors,
} from "@/components/opportunity-graph";
import { EDUCATION_SIDEBAR_LINKS } from "@/lib/constants/navigation";

function EducationRightSidebar() {
  return (
    <>
      <SidebarLinkCard
        title="Education Hub"
        icon="academic"
        links={EDUCATION_SIDEBAR_LINKS}
      />
      <SidebarCTACard
        title="Education Provider?"
        description="List your institution and connect with Indigenous students across Canada."
        buttonLabel="List Your School"
        buttonHref="/organization/education/setup"
        gradient={`linear-gradient(135deg, ${colors.blue} 0%, ${colors.purple} 100%)`}
        buttonTextColor={colors.blue}
      />
    </>
  );
}

export default function EducationPage() {
  return (
    <FeedLayout activeNav="education" rightSidebar={<EducationRightSidebar />}>
      <SectionHeader
        title="Education"
        subtitle="Explore scholarships, training programs, and schools supporting Indigenous learners."
        icon="🎓"
      />
      <OpportunityFeed
        contentTypes={["scholarship", "program"]}
        showTabs={false}
        showBanner={false}
        showFeatured={true}
        maxItems={30}
        emptyMessage="No education opportunities found right now. Check back soon!"
      />
    </FeedLayout>
  );
}

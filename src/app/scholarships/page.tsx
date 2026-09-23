import { Suspense } from "react";
import OpportunityDirectory from "@/components/opportunities/OpportunityDirectory";
import PageSkeleton from "@/components/PageSkeleton";
export default function Page() { return <Suspense fallback={<PageSkeleton variant="grid" />}><OpportunityDirectory kind="scholarships" /></Suspense>; }

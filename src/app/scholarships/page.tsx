import { Suspense } from "react";
import OpportunityDirectory from "@/components/opportunities/OpportunityDirectory";
export default function Page() { return <Suspense fallback={null}><OpportunityDirectory kind="scholarships" /></Suspense>; }

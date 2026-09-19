import Link from "next/link";
import OpportunityHeader from "@/components/OpportunityHeader";
export const metadata = { title: "Explore IOPPS opportunities", robots: { index: false, follow: true } };
export default function OpportunitiesUpdate() {
  return <><OpportunityHeader /><div className="mx-auto max-w-2xl px-5 py-16"><h1 className="text-3xl font-bold text-text">Explore what’s available on IOPPS</h1><p className="my-5 text-text-sec">Training listings are paused. The school and program directories are no longer available.</p><div className="flex flex-wrap gap-4"><Link className="op-button" href="/jobs">Find jobs</Link><Link className="op-button" href="/businesses">Indigenous Entrepreneurship</Link><Link className="op-button" href="/scholarships">Scholarships &amp; funding</Link><Link className="op-button" href="/livestreams">IOPPS Live</Link></div><p className="mt-8 text-text-sec">For help with an existing school account or purchase, <Link href="/contact" className="text-teal underline">contact IOPPS</Link>.</p></div></>;
}

import type { Metadata } from "next";
import Link from "next/link";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { featuredTalentProfiles, getFeaturedTalentByStatus } from "@/lib/featured-talent";

export const metadata: Metadata = {
  title: "Featured Talent controls | IOPPS Admin",
  description: "Featured Talent controls for review, homepage feature selection, profile approval, and social kit preparation.",
};

const controlCards = [
  {
    title: "Review queue",
    body: "Track nominations and submissions before anything is public. Confirm consent, profile copy, public email, photo, and approval notes.",
  },
  {
    title: "Homepage feature",
    body: "Choose one approved profile to surface in the homepage hero and spotlight card. Audrey is currently selected.",
  },
  {
    title: "Social kit",
    body: "Prepare Facebook, Instagram, and LinkedIn captions from approved profile data only. Private contact stays hidden in public copy and graphics.",
  },
];

export default function AdminFeaturedTalentPage() {
  const featured = getFeaturedTalentByStatus("featured");
  const review = getFeaturedTalentByStatus("review");

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:px-6 lg:px-8" data-admin>
      <div className="mx-auto max-w-[1180px]">
        <Link href="/admin" className="text-sm font-bold text-teal no-underline">&larr; Admin dashboard</Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Badge text="Admin scaffold" color="var(--teal)" bg="var(--teal-soft)" />
            <h1 className="mt-4 text-4xl font-black text-text">Featured Talent controls</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-text-sec">
              Manage who is approved, who appears on the homepage, and which approved profiles can receive a social sharing package.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Card variant="list"><div className="p-4"><p className="text-2xl font-black text-text">{featured.length}</p><p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Featured live</p></div></Card>
            <Card variant="list"><div className="p-4"><p className="text-2xl font-black text-text">{review.length}</p><p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Review queue</p></div></Card>
            <Card variant="list"><div className="p-4"><p className="text-2xl font-black text-text">{featuredTalentProfiles.length}</p><p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Total profiles</p></div></Card>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {controlCards.map((card) => (
            <Card key={card.title} variant="spotlight">
              <div className="p-5">
                <h2 className="text-xl font-black text-text">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-text-sec">{card.body}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-8">
          <Card>
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-text">Approved profile table</h2>
                  <p className="mt-2 text-sm leading-6 text-text-sec">Static scaffold for the next admin-backed version. Only reviewed public fields should feed public pages.</p>
                </div>
                <Link href="/featured-talent/submit" className="no-underline">
                  <Button variant="outline">View public submit flow</Button>
                </Link>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-black uppercase tracking-[0.14em] text-text-muted">
                      <th className="py-3 pr-4">Name</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Homepage feature</th>
                      <th className="py-3 pr-4">Social kit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featuredTalentProfiles.map((profile) => (
                      <tr key={profile.slug} className="border-b border-border/70">
                        <td className="py-4 pr-4 font-bold text-text">{profile.name}</td>
                        <td className="py-4 pr-4 text-text-sec">{profile.category}</td>
                        <td className="py-4 pr-4 text-text-sec">{profile.adminControls.status}</td>
                        <td className="py-4 pr-4 text-text-sec">{profile.adminControls.showOnHomepage ? "Selected" : "Not selected"}</td>
                        <td className="py-4 pr-4 text-text-sec">{profile.adminControls.allowSocialShare ? "Approved" : "Hold"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

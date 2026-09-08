import Link from "next/link";
import OpportunityHeader from "@/components/OpportunityHeader";
import Footer from "@/components/Footer";
export const metadata = {
  title: "Indigenous Entrepreneurship Conference | IOPPS",
  description: "Explore the vision for an IOPPS gathering. In planning.",
};
export default function ConferencePage() {
  return (
    <div className="op-site">
      <OpportunityHeader />
      <section className="op-conference-hero">
        <div className="op-wrap">
          <p className="op-eyebrow">In planning · An IOPPS gathering</p>
          <h1>Indigenous Entrepreneurship Conference</h1>
          <p>Business ideas. Community connections. A little AI.</p>
        </div>
      </section>
      <div className="op-wrap op-discover">
        <h2>A place to connect, learn, and build.</h2>
        <p className="op-reading">
          We’re shaping a gathering for Indigenous entrepreneurs to share
          practical ideas, strengthen community connections, and explore how AI
          can support their work.
        </p>
        <div className="op-feature-grid">
          <section className="op-feature">
            <h2>The vision</h2>
            <p>
              Conversations grounded in business, community, and useful skills
              for what comes next.
            </p>
          </section>
          <section className="op-feature">
            <h2>Details to come</h2>
            <p>
              Dates, venue, speakers, agenda, and registration have not been
              announced. We’ll share confirmed details here as planning
              progresses.
            </p>
          </section>
        </div>
        <Link className="op-button" href="/events">
          Explore current events →
        </Link>
      </div>
      <Footer />
    </div>
  );
}

import Link from "next/link";
export default function ConferencePromotion() {
  return (
    <section className="op-conference">
      <div>
        <p className="op-eyebrow">In planning · An IOPPS gathering</p>
        <h2>Indigenous Entrepreneurship Conference</h2>
        <p>Business ideas. Community connections. A little AI.</p>
      </div>
      <Link className="op-button" href="/conference">
        Explore the vision →
      </Link>
    </section>
  );
}

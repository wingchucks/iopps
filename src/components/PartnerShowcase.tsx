import Link from "next/link";
import Image from "next/image";
import type { LandingPartner } from "@/lib/server/landing-content";
export default function PartnerShowcase({
  partners,
}: {
  partners: LandingPartner[];
}) {
  if (!partners.length) return null;
  return (
    <section className="op-partners" aria-labelledby="partner-heading">
      <div className="op-wrap">
        <div className="op-section-heading">
          <div>
            <p className="op-eyebrow">Community connections</p>
            <h2 id="partner-heading">Trusted partners</h2>
          </div>
          <Link href="/partners">Meet our partners →</Link>
        </div>
        <div className="op-partner-grid">
          {partners.map((p) => (
            <Link href={p.href} key={p.id} className="op-partner">
              <div className="op-logo-stage">
                {p.logoUrl ? (
                  <Image
                    src={p.logoUrl}
                    width={320}
                    height={120}
                    sizes="(max-width: 540px) 150px, 280px"
                    alt={p.name}
                    loading="lazy"
                  />
                ) : (
                  <span>{p.shortName}</span>
                )}
              </div>
              <div className="op-partner-caption">
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.label}</p>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

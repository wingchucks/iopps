import Link from "next/link";
import { EMPLOYER_OFFERS, employerOfferSignupHref } from "@/lib/employer-offers";
import { PRICE_TAX_NOTE } from "@/lib/pricing";

const GROUPS = [
  { kind: "post", title: "Pay per job post", note: "Post one job at a time, with no commitment." },
  { kind: "annual", title: "Annual plans", note: "For organizations hiring throughout the year." },
] as const;

/** Every purchasable employer offer, each linking to signup with that offer selected. */
export default function EmployerOfferGrid() {
  return (
    <div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-10 lg:grid-cols-2">
      {GROUPS.map((group) => (
        <section key={group.kind} aria-labelledby={`offers-${group.kind}`}>
          <h3 id={`offers-${group.kind}`} className="mb-1 text-lg font-extrabold text-text">{group.title}</h3>
          <p className="mb-4 text-sm text-text-sec">{group.note}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {EMPLOYER_OFFERS.filter((offer) => offer.kind === group.kind).map((offer) => (
              <article key={offer.id} className="relative flex flex-col rounded-2xl border border-border bg-card p-6">
                {offer.badge && (
                  <span className="mb-3 self-start rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[1.5px]" style={{ background: "rgba(13,148,136,.12)", color: "var(--teal)" }}>
                    {offer.badge}
                  </span>
                )}
                <h4 className="mb-2 text-sm font-bold text-text">{offer.name}</h4>
                <p className="mb-0 text-3xl font-extrabold text-text">
                  {offer.priceLabel}
                  <span className="text-base font-semibold text-text-muted"> {offer.periodText}</span>
                </p>
                <p className="mb-3 text-xs font-semibold text-text-muted">{PRICE_TAX_NOTE}</p>
                <p className="mb-4 text-sm text-text-sec">{offer.description}</p>
                <ul className="mb-6 space-y-2">
                  {offer.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-text-sec">
                      <span aria-hidden="true" className="mt-px shrink-0 font-bold text-teal">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={employerOfferSignupHref(offer.id)}
                  className="brand-button mt-auto block rounded-xl py-3 text-center text-sm font-bold no-underline transition-all"
                  style={offer.kind === "annual" && offer.badge
                    ? { background: "var(--button-gradient)", color: "#fff" }
                    : { border: "1.5px solid var(--border)", color: "var(--button-gradient-soft-text)", background: "var(--button-gradient-soft)" }}
                >
                  Choose<span className="sr-only"> the {offer.name}</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

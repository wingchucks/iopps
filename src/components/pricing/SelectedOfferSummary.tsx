import { employerOffer } from "@/lib/employer-offers";
import { PRICE_TAX_NOTE } from "@/lib/pricing";

/** Keeps the offer a visitor chose in view through signup and email verification. */
export default function SelectedOfferSummary({ planId, changeHref = "/for-employers#pricing" }: { planId: unknown; changeHref?: string }) {
  const offer = employerOffer(planId);
  if (!offer) return null;
  return (
    <div
      role="status"
      style={{
        marginBottom: 24,
        padding: "14px 16px",
        borderRadius: 12,
        border: "1px solid rgba(13,148,136,.35)",
        background: "rgba(13,148,136,.08)",
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      <p style={{ margin: 0 }}>
        <strong>You chose the {offer.name}:</strong> {offer.priceLabel} {offer.periodText} ({PRICE_TAX_NOTE}).
      </p>
      <p style={{ margin: "4px 0 0", opacity: 0.85 }}>
        You&apos;ll review it and pay at checkout once your account is set up. Nothing is charged before then.{" "}
        <a href={changeHref} style={{ color: "var(--teal, #14b8a6)", fontWeight: 600 }}>Change</a>
      </p>
    </div>
  );
}

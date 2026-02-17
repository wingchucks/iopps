import type { Endorsement } from "@/lib/firestore/endorsements";
import Avatar from "./Avatar";

const typeBadgeStyles: Record<
  Endorsement["type"],
  { bg: string; color: string; label: string }
> = {
  skill: { bg: "rgba(13,148,136,.1)", color: "var(--teal)", label: "Skill" },
  character: {
    bg: "rgba(139,92,246,.1)",
    color: "#8B5CF6",
    label: "Character",
  },
  work: { bg: "rgba(217,119,6,.1)", color: "#D97706", label: "Work" },
};

interface EndorsementCardProps {
  endorsement: Endorsement;
}

export default function EndorsementCard({ endorsement }: EndorsementCardProps) {
  const badge = typeBadgeStyles[endorsement.type];
  const date = endorsement.createdAt
    ? new Date(
        (endorsement.createdAt as { seconds: number }).seconds * 1000
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div
      className="bg-card rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      <div style={{ padding: 20 }}>
        {/* Header: endorser info + type badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Avatar
              name={endorsement.endorserName}
              size={40}
              src={endorsement.endorserAvatar || undefined}
            />
            <div>
              <p className="text-sm font-bold text-text m-0">
                {endorsement.endorserName}
              </p>
              <p className="text-xs text-text-muted m-0">
                {[endorsement.endorserTitle, endorsement.endorserOrg]
                  .filter(Boolean)
                  .join(" at ")}
              </p>
            </div>
          </div>
          <span
            className="text-xs font-semibold rounded-lg shrink-0"
            style={{
              padding: "4px 10px",
              background: badge.bg,
              color: badge.color,
            }}
          >
            {badge.label}
          </span>
        </div>

        {/* Message */}
        {endorsement.message && (
          <p className="text-sm text-text-sec leading-relaxed m-0 mb-3">
            &ldquo;{endorsement.message}&rdquo;
          </p>
        )}

        {/* Skills chips */}
        {endorsement.skills && endorsement.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {endorsement.skills.map((skill) => (
              <span
                key={skill}
                className="text-xs font-semibold rounded-lg"
                style={{
                  padding: "3px 10px",
                  background: "rgba(13,148,136,.06)",
                  color: "var(--teal)",
                  border: "1px solid rgba(13,148,136,.12)",
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Date */}
        {date && (
          <p className="text-xs text-text-muted m-0">{date}</p>
        )}
      </div>
    </div>
  );
}

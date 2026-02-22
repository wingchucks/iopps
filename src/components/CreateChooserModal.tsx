"use client";

import { useRouter } from "next/navigation";

interface CreateChooserModalProps {
  open: boolean;
  onClose: () => void;
  onShareStory: () => void;
  hasOrg: boolean;
}

const options = [
  {
    id: "story",
    icon: "\u270F\uFE0F",
    label: "Share a Story",
    description: "Share an update with the community",
    orgOnly: false,
  },
  {
    id: "job",
    icon: "\uD83D\uDCBC",
    label: "Post a Job",
    description: "Create a job posting",
    orgOnly: true,
    href: "/org/dashboard?create=job",
  },
  {
    id: "scholarship",
    icon: "\uD83C\uDF93",
    label: "Post a Scholarship",
    description: "Offer a scholarship opportunity",
    orgOnly: true,
    href: "/org/dashboard",
  },
  {
    id: "event",
    icon: "\uD83D\uDCC5",
    label: "Post an Event",
    description: "Share an upcoming event",
    orgOnly: true,
    href: "/org/dashboard",
  },
];

export default function CreateChooserModal({
  open,
  onClose,
  onShareStory,
  hasOrg,
}: CreateChooserModalProps) {
  const router = useRouter();

  if (!open) return null;

  const visibleOptions = options.filter((o) => !o.orgOnly || hasOrg);
  const hasOrgOptions = visibleOptions.some((o) => o.orgOnly);

  const handleSelect = (option: (typeof options)[number]) => {
    onClose();
    if (option.id === "story") {
      onShareStory();
    } else if (option.href) {
      router.push(option.href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-sm mx-4"
        style={{ border: "1.5px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-border"
          style={{ padding: "14px 20px" }}
        >
          <h3 className="text-base font-bold text-text m-0">Create</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full border-none cursor-pointer text-lg text-text-muted"
            style={{ background: "var(--border)" }}
          >
            &#10005;
          </button>
        </div>

        {/* Options */}
        <div style={{ padding: "8px 12px" }}>
          {/* Community options */}
          {visibleOptions
            .filter((o) => !o.orgOnly)
            .map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className="flex items-center gap-3 w-full text-left rounded-xl border-none cursor-pointer transition-colors hover:bg-bg"
                style={{
                  padding: "12px 12px",
                  background: "transparent",
                }}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{
                    background:
                      "color-mix(in srgb, var(--teal) 10%, transparent)",
                  }}
                >
                  {option.icon}
                </span>
                <div>
                  <p
                    className="text-sm font-semibold m-0"
                    style={{ color: "var(--text)" }}
                  >
                    {option.label}
                  </p>
                  <p
                    className="text-xs m-0 mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {option.description}
                  </p>
                </div>
              </button>
            ))}

          {/* Org section divider */}
          {hasOrgOptions && (
            <div className="flex items-center gap-3 my-1 px-3">
              <div
                className="flex-1 h-px"
                style={{ background: "var(--border)" }}
              />
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                Organization
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "var(--border)" }}
              />
            </div>
          )}

          {/* Org options */}
          {visibleOptions
            .filter((o) => o.orgOnly)
            .map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className="flex items-center gap-3 w-full text-left rounded-xl border-none cursor-pointer transition-colors hover:bg-bg"
                style={{
                  padding: "12px 12px",
                  background: "transparent",
                }}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{
                    background:
                      "color-mix(in srgb, var(--navy) 8%, transparent)",
                  }}
                >
                  {option.icon}
                </span>
                <div>
                  <p
                    className="text-sm font-semibold m-0"
                    style={{ color: "var(--text)" }}
                  >
                    {option.label}
                  </p>
                  <p
                    className="text-xs m-0 mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
        </div>

        {/* Bottom padding */}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

import Link from "next/link";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import ThemeToggle from "@/components/ThemeToggle";

const partners = [
  { name: "Saskatchewan Indian Gaming Authority", short: "SIGA", tier: "premium" as const },
  { name: "Saskatchewan Polytechnic", short: "SP", tier: "school" as const },
  { name: "Saskatoon Tribal Council", short: "STC", tier: "premium" as const },
  { name: "First Nations University", short: "FNUniv", tier: "school" as const },
  { name: "Westland Corp", short: "WC", tier: "premium" as const },
];

const categories = [
  { icon: "\u{1F4BC}", title: "Jobs & Careers", count: "112", desc: "Active Indigenous-focused job postings" },
  { icon: "\u{1FAB6}", title: "Events & Pow Wows", count: "28", desc: "Pow wows, hockey, career fairs, round dances" },
  { icon: "\u{1F393}", title: "Scholarships & Grants", count: "15", desc: "Funding for students & entrepreneurs" },
  { icon: "\u{1F3EA}", title: "Shop Indigenous", count: "42", desc: "Indigenous-owned businesses" },
  { icon: "\u{1F4DA}", title: "Schools & Programs", count: "18", desc: "Training and education programs" },
  { icon: "\u{1F4FA}", title: "IOPPS Spotlight", count: "50+", desc: "Live streams, interviews, stories" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section
        className="relative overflow-hidden text-center"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 40%, #0D3B66 70%, var(--teal) 100%)",
          padding: "clamp(48px, 8vw, 100px) clamp(20px, 6vw, 80px) clamp(48px, 6vw, 80px)",
        }}
      >
        {/* Top nav */}
        <div className="relative flex items-center justify-between mb-0 z-10">
          <div />
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm font-semibold no-underline"
              style={{ color: "rgba(255,255,255,.7)" }}
            >
              Pricing
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Decorative circles */}
        <div
          className="absolute rounded-full"
          style={{ top: -100, right: -100, width: 400, height: 400, background: "rgba(13,148,136,.06)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ bottom: -60, left: -60, width: 300, height: 300, background: "rgba(217,119,6,.04)" }}
        />

        <h1 className="relative text-white font-black tracking-[4px] mb-4 text-4xl md:text-6xl lg:text-[72px]">
          IOPPS
        </h1>

        <p
          className="relative inline-block text-white text-sm font-extrabold tracking-[4px] rounded-full mb-7"
          style={{
            padding: "8px 24px",
            background: "linear-gradient(90deg, rgba(13,148,136,.35), rgba(217,119,6,.25))",
            border: "1px solid rgba(255,255,255,.15)",
          }}
        >
          EMPOWERING INDIGENOUS SUCCESS
        </p>

        <h2 className="relative text-white text-xl md:text-[28px] font-semibold mx-auto mb-4 leading-snug max-w-[600px]">
          Where Indigenous Communities Connect with Opportunities
        </h2>

        <p className="relative text-base leading-relaxed mx-auto mb-10 max-w-[520px]" style={{ color: "rgba(255,255,255,.65)" }}>
          Jobs, events, scholarships, businesses, schools, and livestreams — all in one place for Indigenous people across North America.
        </p>

        <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link href="/signup">
            <Button
              primary
              style={{
                background: "var(--teal)",
                fontSize: 17,
                padding: "16px 40px",
                borderRadius: 14,
                fontWeight: 700,
              }}
            >
              Join the Community
            </Button>
          </Link>
          <Link href="/login">
            <Button
              style={{
                color: "#fff",
                borderColor: "rgba(255,255,255,.25)",
                fontSize: 17,
                padding: "16px 40px",
                borderRadius: 14,
              }}
            >
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Partner Strip */}
      <section className="border-b border-border px-5 md:px-10 lg:px-20 py-8">
        <div className="flex justify-between items-center mb-5">
          <p className="text-xs font-bold text-text-muted tracking-[2px] m-0">OUR PARTNERS</p>
          <p className="text-text-muted tracking-[2.5px] m-0 opacity-50" style={{ fontSize: 9, fontWeight: 800 }}>
            EMPOWERING INDIGENOUS SUCCESS
          </p>
        </div>
        <div className="flex gap-6 justify-center flex-wrap">
          {partners.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl cursor-pointer transition-all duration-150 min-w-[180px]"
              style={{
                padding: "12px 20px",
                border:
                  p.tier === "school"
                    ? "1.5px solid rgba(13,148,136,.19)"
                    : "1.5px solid var(--border)",
                background: p.tier === "school" ? "rgba(13,148,136,.02)" : "var(--card)",
              }}
            >
              <Avatar
                name={p.short}
                size={40}
                gradient={
                  p.tier === "school"
                    ? "linear-gradient(135deg, rgba(13,148,136,.13), rgba(37,99,235,.09))"
                    : "linear-gradient(135deg, rgba(15,43,76,.06), rgba(13,148,136,.05))"
                }
              />
              <div>
                <p className="text-[13px] font-semibold text-text m-0">{p.name}</p>
                <Badge
                  text={p.tier === "school" ? "\u{1F393} Education Partner" : "\u2713 Premium Partner"}
                  color={p.tier === "school" ? "var(--teal)" : "var(--gold)"}
                  bg={p.tier === "school" ? "var(--teal-soft)" : "var(--gold-soft)"}
                  small
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What's on IOPPS */}
      <section className="px-5 md:px-10 lg:px-20 py-8 md:py-12">
        <h3 className="text-2xl font-extrabold text-text mb-8 text-center">What&apos;s on IOPPS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-[900px] mx-auto">
          {categories.map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-card text-center transition-all duration-200 border border-border hover:shadow-md"
            >
              <span className="text-4xl block mb-2">{item.icon}</span>
              <p className="text-base font-bold text-text mb-1">{item.title}</p>
              <p className="text-[28px] font-black text-teal mb-1">{item.count}</p>
              <p className="text-[13px] text-text-sec m-0">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Footer */}
      <section className="text-center border-t border-border px-5 md:px-10 lg:px-20 py-10 md:py-12">
        <p className="text-3xl md:text-5xl font-black mb-2" style={{ color: "var(--hero-stat)" }}>84,200+</p>
        <p className="text-base text-text-sec mb-5">Community members and growing</p>
        <p className="text-teal m-0" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4 }}>
          EMPOWERING INDIGENOUS SUCCESS
        </p>
      </section>
    </div>
  );
}

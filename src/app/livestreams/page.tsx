"use client";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function LivestreamsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <NavBar />

      {/* Hero */}
      <section
        className="relative overflow-hidden text-center"
        style={{
          background:
            "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
          padding: "clamp(48px, 8vw, 80px) clamp(20px, 6vw, 80px)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute rounded-full"
          style={{
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            background: "rgba(220,38,38,.06)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: -40,
            left: -40,
            width: 200,
            height: 200,
            background: "rgba(13,148,136,.06)",
          }}
        />

        {/* Live icon */}
        <div className="relative mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(220,38,38,.15)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(220,38,38,.3)" }}>
            <div className="w-4 h-4 rounded-full bg-red-500" style={{ background: "#DC2626", animation: "pulse-live 2s ease-in-out infinite" }} />
          </div>
        </div>

        <h1 className="relative text-white font-black text-3xl md:text-5xl mb-4">
          IOPPS Live
        </h1>
        <p
          className="relative text-lg md:text-xl mx-auto mb-4 max-w-[560px] leading-relaxed"
          style={{ color: "rgba(255,255,255,.7)" }}
        >
          Live streams, interviews, panels, and community events — streaming directly to you.
        </p>
        <p
          className="relative inline-block text-sm font-bold tracking-[2px] rounded-full mb-8"
          style={{
            padding: "8px 24px",
            background: "rgba(220,38,38,.15)",
            color: "#FCA5A5",
            border: "1px solid rgba(220,38,38,.2)",
          }}
        >
          COMING SOON
        </p>
      </section>

      {/* Features preview */}
      <section className="px-5 md:px-10 lg:px-20 py-12 md:py-16">
        <h2 className="text-2xl font-extrabold text-text text-center mb-8">
          What to Expect
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[900px] mx-auto">
          {[
            {
              icon: "\u{1F399}",
              title: "Live Interviews",
              desc: "Watch interviews with Indigenous leaders, entrepreneurs, and changemakers.",
            },
            {
              icon: "\u{1F3A4}",
              title: "Community Panels",
              desc: "Join live panel discussions on career development, culture, and innovation.",
            },
            {
              icon: "\u{1F4FA}",
              title: "Event Broadcasts",
              desc: "Stream pow wows, career fairs, round dances, and cultural events live.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-card border border-border text-center"
            >
              <span className="text-4xl block mb-3">{item.icon}</span>
              <h3 className="text-base font-bold text-text mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-text-sec leading-relaxed m-0">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center border-t border-border px-5 py-12">
        <p className="text-xl font-extrabold text-text mb-2">
          Stay Tuned
        </p>
        <p className="text-sm text-text-sec mb-6 max-w-[400px] mx-auto">
          Livestreaming is coming to IOPPS. Join the community to be the first
          to know when we go live.
        </p>
        <Link
          href="/signup"
          className="inline-block rounded-[14px] px-8 py-3 font-bold text-sm no-underline"
          style={{ background: "var(--teal)", color: "#fff" }}
        >
          Join IOPPS
        </Link>
      </section>

      <Footer />

      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

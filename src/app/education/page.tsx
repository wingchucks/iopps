"use client";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";

const categories = [
  {
    title: "Schools",
    description:
      "Browse Indigenous-focused universities, colleges, and polytechnics offering culturally grounded education.",
    href: "/schools",
    icon: "&#127979;",
    color: "var(--teal)",
    bg: "var(--teal-soft)",
  },
  {
    title: "Training",
    description:
      "Find skills training, certifications, and workforce development programs designed for Indigenous communities.",
    href: "/training",
    icon: "&#128736;",
    color: "var(--blue)",
    bg: "var(--blue-soft)",
  },
  {
    title: "Programs",
    description:
      "Explore degree programs, diplomas, and certificates from our education partners across Canada.",
    href: "/programs",
    icon: "&#128218;",
    color: "var(--purple)",
    bg: "var(--purple-soft)",
  },
  {
    title: "Scholarships",
    description:
      "Discover scholarships, bursaries, and funding opportunities for Indigenous students and learners.",
    href: "/scholarships",
    icon: "&#127891;",
    color: "var(--gold)",
    bg: "var(--gold-soft)",
  },
];

export default function EducationPage() {
  return (
    <div className="min-h-screen bg-bg">
      <NavBar />

      {/* Hero */}
      <section
        className="text-center"
        style={{
          background: "linear-gradient(160deg, var(--teal) 0%, var(--navy) 50%, var(--blue) 100%)",
          padding: "clamp(40px, 6vw, 80px) clamp(20px, 6vw, 80px)",
        }}
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Education Hub</h1>
        <p className="text-base md:text-lg text-white/70 mb-0 max-w-[560px] mx-auto">
          Your gateway to Indigenous education, training, and lifelong learning opportunities
        </p>
      </section>

      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10">
        {/* Category cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {categories.map((cat) => (
            <Link key={cat.href} href={cat.href} className="no-underline">
              <Card className="h-full hover:shadow-lg transition-shadow">
                <div style={{ padding: 24 }}>
                  <div
                    className="flex items-center justify-center rounded-2xl mb-4"
                    style={{
                      width: 56,
                      height: 56,
                      background: cat.bg,
                    }}
                  >
                    <span
                      className="text-2xl"
                      dangerouslySetInnerHTML={{ __html: cat.icon }}
                    />
                  </div>
                  <h2 className="text-lg font-extrabold text-text mb-2">{cat.title}</h2>
                  <p className="text-sm text-text-sec leading-relaxed mb-4 m-0">
                    {cat.description}
                  </p>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: cat.color }}
                  >
                    Explore {cat.title} &#8594;
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats section */}
        <div
          className="rounded-2xl mt-10"
          style={{
            background: "linear-gradient(135deg, var(--navy), var(--navy-light))",
            padding: "clamp(24px, 4vw, 40px)",
          }}
        >
          <h3 className="text-xl font-extrabold text-white text-center mb-6">
            Empowering Indigenous Education
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { value: "50+", label: "Partner Schools" },
              { value: "200+", label: "Programs" },
              { value: "100+", label: "Scholarships" },
              { value: "1,000+", label: "Learners Connected" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-extrabold text-teal-light m-0">{stat.value}</p>
                <p className="text-xs text-white/50 m-0 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Browse all organizations link */}
        <div className="text-center mt-8">
          <Link
            href="/organizations"
            className="text-sm font-semibold no-underline hover:underline"
            style={{ color: "var(--teal)" }}
          >
            Browse all organizations &#8594;
          </Link>
        </div>
      </div>
    </div>
  );
}

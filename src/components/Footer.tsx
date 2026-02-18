import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer
      className="mt-auto"
      style={{ background: "var(--navy-deep)", borderTop: "1px solid rgba(255,255,255,.08)" }}
    >
      <div className="max-w-[1200px] mx-auto px-4 py-5 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="IOPPS" width={24} height={24} />
          <span className="text-white font-extrabold text-sm tracking-wide">IOPPS</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>
            &copy; {new Date().getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs font-medium no-underline hover:underline transition-colors"
              style={{ color: "rgba(255,255,255,.55)" }}
            >
              {label}
            </Link>
          ))}
          <a
            href="mailto:info@iopps.ca"
            className="text-xs font-medium no-underline hover:underline transition-colors"
            style={{ color: "rgba(255,255,255,.55)" }}
          >
            info@iopps.ca
          </a>
        </div>
      </div>
    </footer>
  );
}

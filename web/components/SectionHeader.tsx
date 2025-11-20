type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className = "",
}: SectionHeaderProps) {
  return (
    <section className={className}>
      <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-sm text-slate-400 sm:text-base">{subtitle}</p>
      )}
    </section>
  );
}

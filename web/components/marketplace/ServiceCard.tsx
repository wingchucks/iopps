import Link from "next/link";
import { Service } from "@/lib/types";
import { MapPinIcon, WrenchScrewdriverIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";

interface ServiceCardProps {
    service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
    return (
        <div className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--card-border)] bg-surface transition-all hover:border-blue-500/50 hover:bg-surface hover:shadow-lg hover:shadow-blue-500/10">
            <div className="flex flex-1 flex-col p-5">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-700/50">
                            {service.logoUrl ? (
                                <img
                                    src={service.logoUrl}
                                    alt={service.businessName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-foreground0">
                                    <WrenchScrewdriverIcon className="h-5 w-5" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                                {service.title}
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] line-clamp-1">
                                {service.businessName}
                            </p>
                        </div>
                    </div>
                    {service.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/20">
                            <CheckBadgeIcon className="h-3 w-3" />
                            Verified
                        </span>
                    )}
                </div>

                <p className="mb-4 line-clamp-2 text-sm text-[var(--text-muted)] flex-1">
                    {service.tagline || service.description}
                </p>

                <div className="mt-auto space-y-3 border-t border-[var(--card-border)] pt-4">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{service.location || service.region}</span>
                        </div>
                        {service.priceRange && (
                            <span className="font-medium text-white">{service.priceRange}</span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-md bg-slate-700/50 px-2 py-1 text-xs font-medium text-[var(--text-secondary)]">
                            {service.category.replace('_', ' ')}
                        </span>
                        {service.indigenousOwned && (
                            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
                                Indigenous Owned
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex bg-surface p-3">
                <Link
                    href={`/business/services/${service.id}`}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                    View Service
                </Link>
            </div>
        </div>
    );
}

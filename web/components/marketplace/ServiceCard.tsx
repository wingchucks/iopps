import Link from "next/link";
import { Service } from "@/lib/types";
import { MapPinIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

interface ServiceCardProps {
    service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
    return (
        <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 transition-all hover:border-blue-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="flex flex-1 flex-col p-5">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-700/50">
                            {service.provider.logo ? (
                                <img
                                    src={service.provider.logo}
                                    alt={service.provider.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-500">
                                    <WrenchScrewdriverIcon className="h-5 w-5" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                                {service.title}
                            </h3>
                            <p className="text-sm text-slate-400 line-clamp-1">
                                {service.provider.name}
                            </p>
                        </div>
                    </div>
                    {service.provider.isVerified && (
                        <span className="inline-flex items-center rounded-full bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/20">
                            Verified
                        </span>
                    )}
                </div>

                <p className="mb-4 line-clamp-2 text-sm text-slate-400 flex-1">
                    {service.shortDescription}
                </p>

                <div className="mt-auto space-y-3 border-t border-slate-700/50 pt-4">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{service.location.city}, {service.location.province}</span>
                        </div>
                        <span className="font-medium text-white">{service.priceDisplay}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-md bg-slate-700/50 px-2 py-1 text-xs font-medium text-slate-300">
                            {service.category.replace('_', ' ')}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-slate-700/50 px-2 py-1 text-xs font-medium text-slate-300">
                            {service.priceType}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex bg-slate-900/50 p-3">
                <Link
                    href={`/marketplace/services/${service.id}`}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-blue-500"
                >
                    View Details
                </Link>
            </div>
        </div>
    );
}

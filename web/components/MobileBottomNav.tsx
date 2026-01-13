"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {

    VideoCameraIcon,
    MapIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
    VideoCameraIcon as VideoCameraIconSolid,
    MapIcon as MapIconSolid,
    UserCircleIcon as UserCircleIconSolid,
} from "@heroicons/react/24/solid";

const navItems = [
    { href: "/live", label: "Live", Icon: VideoCameraIcon, ActiveIcon: VideoCameraIconSolid },
    { href: "/map", label: "Map", Icon: MapIcon, ActiveIcon: MapIconSolid },
    { href: "/member/dashboard", label: "Dashboard", Icon: UserCircleIcon, ActiveIcon: UserCircleIconSolid },
];

export function MobileBottomNav() {
    const pathname = usePathname();

    // Hide on certain pages
    const hiddenPaths = ["/login", "/register", "/organization"];
    const shouldHide = hiddenPaths.some((path) => pathname.startsWith(path));

    if (shouldHide) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-lg md:hidden safe-area-inset-bottom">
            <div className="flex items-stretch justify-around">
                {navItems.map(({ href, label, Icon, ActiveIcon }) => {
                    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                    const IconComponent = isActive ? ActiveIcon : Icon;

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${isActive
                                ? "text-accent"
                                : "text-slate-400 active:text-slate-200"
                                }`}
                        >
                            <IconComponent className="h-6 w-6" />
                            <span>{label}</span>
                            {isActive && (
                                <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

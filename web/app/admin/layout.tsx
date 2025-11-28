"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
    ShieldCheckIcon,
    UsersIcon,
    BriefcaseIcon,
    ChartBarIcon,
    ArrowLeftOnRectangleIcon,
    ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (role !== "moderator" && role !== "admin") {
                router.push("/");
            }
        }
    }, [user, role, loading, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0B0D10] text-slate-400">
                Loading admin panel...
            </div>
        );
    }

    if (!user || (role !== "moderator" && role !== "admin")) {
        return null; // Will redirect via useEffect
    }

    const navigation = [
        { name: "Dashboard", href: "/admin", icon: ChartBarIcon },
        { name: "Employers", href: "/admin/employers", icon: BriefcaseIcon },
        { name: "Users", href: "/admin/users", icon: UsersIcon },
        { name: "Job Auto Import", href: "/admin/feeds", icon: ArrowDownTrayIcon },
    ];

    return (
        <div className="min-h-screen bg-[#0B0D10]">
            <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <div className="hidden w-64 flex-col border-r border-slate-800 bg-[#08090C] md:flex">
                    <div className="flex h-16 items-center border-b border-slate-800 px-6">
                        <Link href="/" className="flex items-center gap-2 font-bold text-slate-100">
                            <ShieldCheckIcon className="h-6 w-6 text-teal-500" />
                            <span>IOPPS Admin</span>
                        </Link>
                    </div>
                    <nav className="flex-1 space-y-1 px-3 py-4">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${isActive
                                            ? "bg-slate-800 text-teal-400"
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                        }`}
                                >
                                    <item.icon
                                        className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-teal-400" : "text-slate-400 group-hover:text-slate-300"
                                            }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="border-t border-slate-800 p-4">
                        <Link
                            href="/"
                            className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                            <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-slate-500 group-hover:text-slate-400" />
                            Back to Site
                        </Link>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-[#08090C] px-6 md:hidden">
                        <div className="flex items-center gap-2 font-bold text-slate-100">
                            <ShieldCheckIcon className="h-6 w-6 text-teal-500" />
                            <span>Admin</span>
                        </div>
                        {/* Mobile menu button could go here */}
                    </header>
                    <main className="flex-1 overflow-y-auto bg-[#0B0D10] p-6">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

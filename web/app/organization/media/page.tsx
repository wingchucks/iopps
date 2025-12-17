"use client";

import Link from "next/link";
import {
    ArrowLeftIcon,
    VideoCameraIcon,
    BuildingOffice2Icon,
    EnvelopeIcon,
    PlayCircleIcon,
} from "@heroicons/react/24/outline";

export default function MediaFeaturesPage() {
    const contentTypes = [
        {
            title: "Quick Interviews",
            duration: "3-5 minutes",
            icon: VideoCameraIcon,
            description: "Short, engaging video content perfect for social media",
            features: [
                "Job posting spotlight",
                "Company introduction",
                "Culture & values discussion",
                "Indigenous employment initiatives",
            ],
        },
        {
            title: "Workplace Tours",
            duration: "~10 minutes",
            icon: BuildingOffice2Icon,
            description: "Authentic, raw footage that connects with viewers",
            features: [
                "Tour your facility",
                "Meet the team",
                "Day-in-the-life content",
                "Raw, minimal editing style",
            ],
        },
    ];

    const platforms = [
        {
            name: "TikTok",
            description: "High engagement, short-form reach",
            color: "bg-pink-500/10 text-pink-400 border-pink-500/30",
        },
        {
            name: "LinkedIn",
            description: "Professional network visibility",
            color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        },
        {
            name: "Facebook",
            description: "IOPPS community engagement",
            color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        },
        {
            name: "YouTube",
            description: "Long-form, searchable content",
            color: "bg-red-500/10 text-red-400 border-red-500/30",
        },
    ];

    const benefits = [
        "Reach thousands of Indigenous job seekers",
        "Showcase your workplace culture authentically",
        "Build your employer brand in Indigenous communities",
        "Support reconciliation through meaningful visibility",
        "Connect with passive candidates browsing social media",
    ];

    return (
        <div className="min-h-screen bg-[#020306]">
            {/* Navigation */}
            <div className="border-b border-slate-800 bg-[#08090C]">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <Link
                        href="/organization"
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10" />
                <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-8">
                        <PlayCircleIcon className="h-10 w-10 text-purple-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        IOPPS Media Features
                    </h1>
                    <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                        Get your company featured across our social platforms. Connect with Indigenous
                        job seekers through authentic video content that showcases your workplace and opportunities.
                    </p>
                </div>
            </div>

            {/* Content Types Section */}
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-white text-center mb-12">
                    Content We Create
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {contentTypes.map((content) => (
                        <div
                            key={content.title}
                            className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10">
                                    <content.icon className="h-7 w-7 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{content.title}</h3>
                                    <span className="text-sm text-purple-400">{content.duration}</span>
                                </div>
                            </div>
                            <p className="text-slate-400 mb-6">{content.description}</p>
                            <ul className="space-y-3">
                                {content.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-slate-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Platforms Section */}
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-white text-center mb-4">
                    Published Across All Platforms
                </h2>
                <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
                    Your content reaches Indigenous job seekers wherever they spend their time online
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {platforms.map((platform) => (
                        <div
                            key={platform.name}
                            className={`rounded-xl border p-6 text-center ${platform.color}`}
                        >
                            <h3 className="font-semibold text-lg mb-2">{platform.name}</h3>
                            <p className="text-sm opacity-80">{platform.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Benefits Section */}
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-white text-center mb-12">
                    Why Feature Your Company?
                </h2>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8">
                    <ul className="space-y-4">
                        {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-4 text-slate-300">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 text-sm font-semibold flex-shrink-0">
                                    {index + 1}
                                </span>
                                {benefit}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Authenticity Note */}
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
                    <h3 className="text-xl font-bold text-amber-400 mb-4">
                        Real & Authentic
                    </h3>
                    <p className="text-slate-400">
                        Our workplace tours are intentionally raw with minimal editing. Viewers appreciate
                        the authenticity and can relate more easily to real workplace environments.
                        This isn&apos;t polished corporate video - it&apos;s genuine content that connects.
                    </p>
                </div>
            </div>

            {/* Service Area */}
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-white text-center mb-8">
                    Service Area
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                        <h3 className="font-semibold text-emerald-400 mb-2">Local Zone - No Travel Fee</h3>
                        <p className="text-slate-400 text-sm">
                            North Battleford, Saskatoon, Lloydminster and surrounding areas
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
                        <h3 className="font-semibold text-slate-300 mb-2">Extended Zone</h3>
                        <p className="text-slate-400 text-sm">
                            Travel fees may apply for locations outside the local zone.
                            Contact us for a quote.
                        </p>
                    </div>
                </div>
            </div>

            {/* Contact CTA */}
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-12 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Interested in Being Featured?
                    </h2>
                    <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                        Contact us to discuss your media feature. We&apos;ll work with you to create
                        content that authentically represents your organization and opportunities.
                    </p>
                    <a
                        href="mailto:hello@iopps.ca?subject=IOPPS Media Feature Inquiry"
                        className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                    >
                        <EnvelopeIcon className="h-5 w-5" />
                        Email IOPPS
                    </a>
                    <p className="mt-4 text-sm text-slate-500">
                        hello@iopps.ca
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 text-center">
                <p className="text-sm text-slate-600">
                    Questions about media features?{" "}
                    <a href="mailto:hello@iopps.ca" className="text-purple-400 hover:underline">
                        Reach out anytime
                    </a>
                </p>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
    listJobPostings,
    listConferences,
    listSchools,
    listTrainingPrograms,
    listPowwowEvents,
    listApprovedVendors
} from "@/lib/firestore";
import { geocodeLocation } from "@/lib/static-geocoding";
import { MapItem } from "./MapClient";
import type { JobPosting, Conference, School, TrainingProgram, PowwowEvent, Vendor } from "@/lib/types";

// 1. Dynamically import MapClient (no SSR for Leaflet)
const MapClient = dynamic(() => import("./MapClient"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[80vh] w-full items-center justify-center bg-slate-900 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
    ),
});

export default function MapPage() {
    const [items, setItems] = useState<MapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                console.log("Fetching map data...");
                // Fetch ALL content types in parallel
                const [jobs, conferences, schools, training, powwows, vendors] = await Promise.all([
                    listJobPostings({ activeOnly: true }),
                    listConferences({ includeExpired: false }),
                    listSchools({ publishedOnly: true }),
                    listTrainingPrograms({ activeOnly: true }),
                    listPowwowEvents({ includeExpired: false }),
                    listApprovedVendors(),
                ]);
                console.log(`Fetched: ${jobs.length} jobs, ${conferences.length} confs, ${schools.length} schools, ${training.length} training, ${powwows.length} powwows, ${vendors.length} vendors.`);

                const mapItems: MapItem[] = [];

                // 1. Jobs
                jobs.forEach((job: JobPosting) => {
                    if (!job.location) return;
                    const coords = geocodeLocation(job.location);
                    if (coords) {
                        mapItems.push({
                            id: job.id,
                            title: job.title,
                            organization: job.employerName || "Employer",
                            type: "job",
                            location: job.location,
                            lat: coords.lat,
                            lng: coords.lng,
                            url: `/organization/jobs/${job.id}`,
                        });
                    }
                });

                // 2. Conferences
                conferences.forEach((conf: Conference) => {
                    if (!conf.location) return;
                    const coords = geocodeLocation(conf.location);
                    if (coords) {
                        mapItems.push({
                            id: conf.id,
                            title: conf.title,
                            organization: conf.organizerName || "Organizer",
                            type: "event",
                            location: conf.location,
                            lat: coords.lat,
                            lng: coords.lng,
                            url: `/conferences/${conf.id}`,
                        });
                    }
                });

                // 3. Schools
                schools.forEach((school: School) => {
                    let locString = "";
                    if (school.headOffice?.city && school.headOffice?.province) {
                        locString = `${school.headOffice.city}, ${school.headOffice.province}`;
                    } else if (school.headOffice?.city) {
                        locString = school.headOffice.city;
                    }

                    if (!locString) return;

                    const coords = geocodeLocation(locString);
                    if (coords) {
                        mapItems.push({
                            id: school.id,
                            title: school.name,
                            organization: "Educational Institution",
                            type: "school",
                            location: locString,
                            lat: coords.lat,
                            lng: coords.lng,
                            url: `/education/schools/${school.slug}`,
                        });
                    }
                });

                // 4. Training Programs (In-person/Hybrid only)
                training.forEach((prog: TrainingProgram) => {
                    if (!prog.location) return;
                    if (prog.format === 'online') return;

                    const coords = geocodeLocation(prog.location);
                    if (coords) {
                        mapItems.push({
                            id: prog.id,
                            title: prog.title,
                            organization: prog.organizationName || prog.providerName || "Training Provider",
                            type: "training",
                            location: prog.location,
                            lat: coords.lat,
                            lng: coords.lng,
                            url: `/education/programs/${prog.id}`,
                        });
                    }
                });

                // 5. Powwows / Events
                powwows.forEach((powwow: PowwowEvent) => {
                    if (!powwow.location) return;
                    const coords = geocodeLocation(powwow.location);
                    if (coords) {
                        mapItems.push({
                            id: powwow.id,
                            title: powwow.name,
                            organization: powwow.host || "Community Host",
                            type: "event",
                            location: powwow.location,
                            lat: coords.lat,
                            lng: coords.lng,
                            url: `/community/${powwow.id}`,
                        });
                    }
                });

                // 6. Vendors (Shop Indigenous)
                vendors.forEach((vendor: Vendor) => {
                    let locString = "";
                    if (typeof vendor.location === 'object' && vendor.location !== null) {
                        // @ts-ignore 
                        const city = vendor.location.city;
                        // @ts-ignore
                        const prov = vendor.location.province || vendor.location.region;
                        if (city && prov) locString = `${city}, ${prov}`;
                        else if (city) locString = city;
                    }
                    // @ts-ignore
                    if (!locString && typeof vendor.location === 'string') locString = vendor.location;

                    if (!locString) return;

                    const coords = geocodeLocation(locString);
                    if (coords) {
                        mapItems.push({
                            id: vendor.id,
                            title: vendor.businessName,
                            organization: "Indigenous Business",
                            type: "vendor",
                            location: locString,
                            lat: coords.lat,
                            lng: coords.lng,
                            url: `/business/directory/${vendor.slug}`,
                        });
                    }
                });

                // Jitter
                const usedCoords = new Set<string>();
                mapItems.forEach((item) => {
                    const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
                    if (usedCoords.has(key)) {
                        item.lat += (Math.random() - 0.5) * 0.01;
                        item.lng += (Math.random() - 0.5) * 0.01;
                    }
                    usedCoords.add(`${item.lat.toFixed(4)},${item.lng.toFixed(4)}`);
                });

                console.log("Map items prepared:", mapItems.length);
                setItems(mapItems);
            } catch (error) {
                console.error("Failed to load map data:", error);
                setError("Failed to load opportunities. Please try again later.");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (error) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center text-red-400">
                <p>Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
                <h1 className="text-xl font-bold text-white">
                    Opportunity Map
                </h1>
                <p className="text-sm text-slate-400">
                    Viewing {items.length} opportunities across Canada
                </p>
            </div>

            <div className="flex-1 relative z-0 min-h-[400px]">
                <MapClient items={items} />
            </div>
        </div>
    );
}

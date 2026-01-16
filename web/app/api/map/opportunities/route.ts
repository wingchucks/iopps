import { NextRequest, NextResponse } from "next/server";
import {
  listJobPostings,
  listConferences,
  listSchools,
  listTrainingPrograms,
  listPowwowEvents,
  listApprovedVendors,
} from "@/lib/firestore";
import { geocodeLocation, calculateDistance, filterByRadius } from "@/lib/static-geocoding";
import type {
  MapOpportunity,
  MapOpportunitiesResponse,
  MapContentType,
  MapCategory,
  contentTypeToCategory,
} from "@/lib/map/types";
import type { JobPosting, Conference, School, TrainingProgram, PowwowEvent, Vendor } from "@/lib/types";

// Cache for 2 minutes
let cache: { data: MapOpportunity[]; time: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000;

/**
 * Transform raw data into MapOpportunity format
 */
function transformToOpportunities(): Promise<MapOpportunity[]> {
  return new Promise(async (resolve) => {
    const opportunities: MapOpportunity[] = [];

    try {
      // Fetch all content types in parallel
      const [jobs, conferences, schools, training, powwows, vendors] = await Promise.all([
        listJobPostings({ activeOnly: true }),
        listConferences({ includeExpired: false }),
        listSchools({ publishedOnly: true }),
        listTrainingPrograms({ activeOnly: true }),
        listPowwowEvents({ includeExpired: false }),
        listApprovedVendors(),
      ]);

      // Transform Jobs
      jobs.forEach((job: JobPosting) => {
        if (!job.location) return;
        const coords = geocodeLocation(job.location);
        if (!coords) return;

        opportunities.push({
          id: job.id,
          type: "job",
          category: "jobs",
          title: job.title,
          organization: job.employerName || "Employer",
          location: job.location,
          coordinates: coords,
          url: `/careers/${job.id}`,
          featured: job.featured || false,
          meta: {
            employmentType: job.employmentType,
            salary: typeof job.salaryRange === 'string' ? job.salaryRange : undefined,
            deadline: job.closingDate
              ? new Date(
                typeof job.closingDate === "object" && "toDate" in job.closingDate
                  ? job.closingDate.toDate()
                  : job.closingDate
              ).toLocaleDateString()
              : undefined,
          },
        });
      });

      // Transform Conferences
      conferences.forEach((conf: Conference) => {
        if (!conf.location) return;
        const coords = geocodeLocation(conf.location);
        if (!coords) return;

        opportunities.push({
          id: conf.id,
          type: "conference",
          category: "events",
          title: conf.title,
          organization: conf.organizerName || "Organizer",
          location: conf.location,
          coordinates: coords,
          url: `/conferences/${conf.id}`,
          featured: conf.featured || false,
          meta: {
            date: conf.startDate
              ? new Date(
                typeof conf.startDate === "object" && "toDate" in conf.startDate
                  ? conf.startDate.toDate()
                  : conf.startDate
              ).toLocaleDateString()
              : undefined,
            venue: conf.venue?.name,
          },
        });
      });

      // Transform Schools
      schools.forEach((school: School) => {
        let locString = "";
        if (school.headOffice?.city && school.headOffice?.province) {
          locString = `${school.headOffice.city}, ${school.headOffice.province}`;
        } else if (school.headOffice?.city) {
          locString = school.headOffice.city;
        }
        if (!locString) return;

        const coords = geocodeLocation(locString);
        if (!coords) return;

        opportunities.push({
          id: school.id,
          type: "school",
          category: "education",
          title: school.name,
          organization: "Educational Institution",
          location: locString,
          coordinates: coords,
          url: `/education/schools/${school.slug}`,
          featured: false, // Schools don't have a featured field
          meta: {
            campusCount: school.campuses?.length,
          },
        });
      });

      // Transform Training Programs (In-person/Hybrid only)
      training.forEach((prog: TrainingProgram) => {
        if (!prog.location) return;
        if (prog.format === "online") return;

        const coords = geocodeLocation(prog.location);
        if (!coords) return;

        opportunities.push({
          id: prog.id,
          type: "training",
          category: "jobs",
          title: prog.title,
          organization: prog.organizationName || prog.providerName || "Training Provider",
          location: prog.location,
          coordinates: coords,
          url: `/education/programs/${prog.id}`,
          featured: prog.featured || false,
          meta: {
            format: prog.format,
            duration: prog.duration,
          },
        });
      });

      // Transform Powwows
      powwows.forEach((powwow: PowwowEvent) => {
        if (!powwow.location) return;
        const coords = geocodeLocation(powwow.location);
        if (!coords) return;

        opportunities.push({
          id: powwow.id,
          type: "powwow",
          category: "events",
          title: powwow.name,
          organization: powwow.host || "Community Host",
          location: powwow.location,
          coordinates: coords,
          url: `/community/${powwow.id}`,
          featured: false,
          meta: {
            date: powwow.startDate
              ? new Date(
                typeof powwow.startDate === "object" && "toDate" in powwow.startDate
                  ? powwow.startDate.toDate()
                  : powwow.startDate
              ).toLocaleDateString()
              : undefined,
            region: powwow.region,
          },
        });
      });

      // Transform Vendors
      vendors.forEach((vendor: Vendor) => {
        let locString = "";
        if (typeof vendor.location === "object" && vendor.location !== null) {
          // @ts-ignore - location might have city/province structure
          const city = vendor.location.city;
          // @ts-ignore
          const prov = vendor.location.province || vendor.location.region;
          if (city && prov) locString = `${city}, ${prov}`;
          else if (city) locString = city;
        }
        // @ts-ignore - location might be a string
        if (!locString && typeof vendor.location === "string") locString = vendor.location;
        if (!locString) return;

        const coords = geocodeLocation(locString);
        if (!coords) return;

        opportunities.push({
          id: vendor.id,
          type: "vendor",
          category: "businesses",
          title: vendor.businessName,
          organization: "Indigenous Business",
          location: locString,
          coordinates: coords,
          url: `/business/${vendor.slug}`,
          featured: vendor.featured || false,
          meta: {
            vendorType: vendor.category,
          },
        });
      });

      // Apply jitter for overlapping markers
      const usedCoords = new Set<string>();
      opportunities.forEach((item) => {
        const key = `${item.coordinates.lat.toFixed(4)},${item.coordinates.lng.toFixed(4)}`;
        if (usedCoords.has(key)) {
          item.coordinates = {
            lat: item.coordinates.lat + (Math.random() - 0.5) * 0.01,
            lng: item.coordinates.lng + (Math.random() - 0.5) * 0.01,
          };
        }
        usedCoords.add(`${item.coordinates.lat.toFixed(4)},${item.coordinates.lng.toFixed(4)}`);
      });

      resolve(opportunities);
    } catch (error) {
      console.error("Error transforming opportunities:", error);
      resolve([]);
    }
  });
}

/**
 * GET /api/map/opportunities
 *
 * Query params:
 * - types: comma-separated list of content types (job,vendor,school,etc)
 * - category: filter by category (jobs, events, businesses, education)
 * - search: text search
 * - lat, lng, radius: proximity filter
 * - featured: if "true", only featured items
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const typesParam = searchParams.get("types");
    const types = typesParam ? (typesParam.split(",") as MapContentType[]) : undefined;
    const category = searchParams.get("category") as MapCategory | null;
    const search = searchParams.get("search");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");
    const featuredOnly = searchParams.get("featured") === "true";

    // Get opportunities (from cache or fresh fetch)
    let opportunities: MapOpportunity[];
    if (cache && Date.now() - cache.time < CACHE_DURATION) {
      opportunities = [...cache.data];
    } else {
      opportunities = await transformToOpportunities();
      cache = { data: opportunities, time: Date.now() };
    }

    // Apply filters

    // Type filter
    if (types && types.length > 0) {
      opportunities = opportunities.filter((o) => types.includes(o.type));
    }

    // Category filter (takes precedence over types if both specified)
    if (category) {
      opportunities = opportunities.filter((o) => o.category === category);
    }

    // Featured filter
    if (featuredOnly) {
      opportunities = opportunities.filter((o) => o.featured);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      opportunities = opportunities.filter((o) => {
        const searchableText = [
          o.title,
          o.organization,
          o.location,
          ...Object.values(o.meta).filter(Boolean),
        ]
          .join(" ")
          .toLowerCase();
        return searchableText.includes(searchLower);
      });
    }

    // Proximity filter
    let center: { lat: number; lng: number } | undefined;
    let radiusKm: number | undefined;

    if (lat && lng && radius) {
      center = { lat: parseFloat(lat), lng: parseFloat(lng) };
      radiusKm = parseInt(radius, 10);

      // Filter by radius and add distance to each item
      const withDistance = filterByRadius(
        opportunities.map((o) => ({ ...o, coordinates: o.coordinates })),
        center,
        radiusKm
      );

      opportunities = withDistance.map((o) => ({
        ...o,
        distance: o.distance,
      }));
    }

    // Calculate counts
    const counts = {
      total: opportunities.length,
      byCategory: {
        jobs: 0,
        events: 0,
        businesses: 0,
        education: 0,
      } as Record<MapCategory, number>,
      byType: {
        job: 0,
        conference: 0,
        school: 0,
        training: 0,
        powwow: 0,
        vendor: 0,
      } as Record<MapContentType, number>,
    };

    opportunities.forEach((o) => {
      counts.byCategory[o.category]++;
      counts.byType[o.type]++;
    });

    const response: MapOpportunitiesResponse = {
      opportunities,
      counts,
      center,
      radiusKm,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=120",
      },
    });
  } catch (error) {
    console.error("Error in map opportunities API:", error);
    return NextResponse.json(
      {
        opportunities: [],
        counts: {
          total: 0,
          byCategory: { jobs: 0, events: 0, businesses: 0, education: 0 },
          byType: { job: 0, conference: 0, school: 0, training: 0, powwow: 0, vendor: 0 },
        },
      },
      { status: 500 }
    );
  }
}

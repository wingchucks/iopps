export interface Coordinates {
    lat: number;
    lng: number;
}

// Major Canadian cities lookup
// This serves as our "MVP" geocoder rather than paying for Google Maps API
export const CANADIAN_CITIES: Record<string, Coordinates> = {
    // British Columbia
    "Vancouver, BC": { lat: 49.2827, lng: -123.1207 },
    "Victoria, BC": { lat: 48.4284, lng: -123.3656 },
    "Kelowna, BC": { lat: 49.8880, lng: -119.4960 },
    "Kamloops, BC": { lat: 50.6745, lng: -120.3273 },
    "Prince George, BC": { lat: 53.9171, lng: -122.7497 },
    "Nanaimo, BC": { lat: 49.1659, lng: -123.9401 },

    // Alberta
    "Calgary, AB": { lat: 51.0447, lng: -114.0719 },
    "Edmonton, AB": { lat: 53.5461, lng: -113.4938 },
    "Red Deer, AB": { lat: 52.2690, lng: -113.8115 },
    "Lethbridge, AB": { lat: 49.6937, lng: -112.8418 },

    // Saskatchewan
    "Saskatoon, SK": { lat: 52.1332, lng: -106.6700 },
    "Regina, SK": { lat: 50.4452, lng: -104.6189 },
    "Prince Albert, SK": { lat: 53.2033, lng: -105.7541 },

    // Manitoba
    "Winnipeg, MB": { lat: 49.8951, lng: -97.1384 },
    "Brandon, MB": { lat: 49.8485, lng: -99.9501 },

    // Ontario
    "Toronto, ON": { lat: 43.6532, lng: -79.3832 },
    "Ottawa, ON": { lat: 45.4215, lng: -75.6972 },
    "Mississauga, ON": { lat: 43.5890, lng: -79.6441 },
    "Hamilton, ON": { lat: 43.2557, lng: -79.8711 },
    "London, ON": { lat: 42.9849, lng: -81.2453 },
    "Windsor, ON": { lat: 42.3149, lng: -83.0477 },
    "Kingston, ON": { lat: 44.2298, lng: -76.4860 },
    "Sudbury, ON": { lat: 46.4917, lng: -80.9930 },
    "Thunder Bay, ON": { lat: 48.3809, lng: -89.2477 },

    // Quebec
    "Montreal, QC": { lat: 45.5017, lng: -73.5673 },
    "Quebec City, QC": { lat: 46.8139, lng: -71.2080 },
    "Gatineau, QC": { lat: 45.4765, lng: -75.7013 },
    "Sherbrooke, QC": { lat: 45.4042, lng: -71.8929 },

    // Maritimes & Atlantic
    "Halifax, NS": { lat: 44.6488, lng: -63.5752 },
    "Fredericton, NB": { lat: 45.9636, lng: -66.6431 },
    "Moncton, NB": { lat: 46.0878, lng: -64.7782 },
    "Saint John, NB": { lat: 45.2733, lng: -66.0635 },
    "Charlottetown, PE": { lat: 46.2382, lng: -63.1311 },
    "St. John's, NL": { lat: 47.5615, lng: -52.7126 },

    // North
    "Whitehorse, YT": { lat: 60.7212, lng: -135.0568 },
    "Yellowknife, NT": { lat: 62.4540, lng: -114.3718 },
    "Iqaluit, NU": { lat: 63.7467, lng: -68.5170 },
};

/**
 * Normalizes location string and attempts to find coordinates.
 * Handles variations like "Toronto" -> "Toronto, ON" default if ambiguous,
 * or simple case-insensitive matching.
 */
export function geocodeLocation(location: string): Coordinates | null {
    if (!location) return null;

    const normalized = location.trim();

    // 1. Direct match
    if (CANADIAN_CITIES[normalized]) {
        return CANADIAN_CITIES[normalized];
    }

    // 2. Case-insensitive match
    const lowerValues = Object.keys(CANADIAN_CITIES).reduce((acc, key) => {
        acc[key.toLowerCase()] = CANADIAN_CITIES[key];
        return acc;
    }, {} as Record<string, Coordinates>);

    if (lowerValues[normalized.toLowerCase()]) {
        return lowerValues[normalized.toLowerCase()];
    }

    // 3. Partial match (e.g. "Toronto" matches "Toronto, ON")
    // Prefer exact city name match over just substring
    for (const [key, coords] of Object.entries(CANADIAN_CITIES)) {
        const cityName = key.split(',')[0].trim();
        if (cityName.toLowerCase() === normalized.toLowerCase()) {
            return coords;
        }
    }

    return null;
}

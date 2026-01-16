export interface Coordinates {
    lat: number;
    lng: number;
}

// Comprehensive Canadian cities and Indigenous communities lookup
// Serves as our geocoder - no external API costs
export const CANADIAN_CITIES: Record<string, Coordinates> = {
    // ============================================
    // BRITISH COLUMBIA
    // ============================================
    "Vancouver, BC": { lat: 49.2827, lng: -123.1207 },
    "Victoria, BC": { lat: 48.4284, lng: -123.3656 },
    "Kelowna, BC": { lat: 49.8880, lng: -119.4960 },
    "Kamloops, BC": { lat: 50.6745, lng: -120.3273 },
    "Prince George, BC": { lat: 53.9171, lng: -122.7497 },
    "Nanaimo, BC": { lat: 49.1659, lng: -123.9401 },
    "Burnaby, BC": { lat: 49.2488, lng: -122.9805 },
    "Surrey, BC": { lat: 49.1913, lng: -122.8490 },
    "Richmond, BC": { lat: 49.1666, lng: -123.1336 },
    "Abbotsford, BC": { lat: 49.0504, lng: -122.3045 },
    "Coquitlam, BC": { lat: 49.2838, lng: -122.7932 },
    "Langley, BC": { lat: 49.1044, lng: -122.6608 },
    "Chilliwack, BC": { lat: 49.1579, lng: -121.9514 },
    "Courtenay, BC": { lat: 49.6871, lng: -124.9936 },
    "Vernon, BC": { lat: 50.2670, lng: -119.2720 },
    "Penticton, BC": { lat: 49.4991, lng: -119.5937 },
    "Duncan, BC": { lat: 48.7787, lng: -123.7079 },
    "Campbell River, BC": { lat: 50.0244, lng: -125.2475 },
    "Port Alberni, BC": { lat: 49.2339, lng: -124.8055 },
    "Cranbrook, BC": { lat: 49.5097, lng: -115.7688 },
    "Fort St. John, BC": { lat: 56.2465, lng: -120.8476 },
    "Prince Rupert, BC": { lat: 54.3150, lng: -130.3208 },
    "Terrace, BC": { lat: 54.5164, lng: -128.6031 },
    "Williams Lake, BC": { lat: 52.1417, lng: -122.1417 },
    "Dawson Creek, BC": { lat: 55.7596, lng: -120.2377 },
    "Squamish, BC": { lat: 49.7016, lng: -123.1558 },
    "Whistler, BC": { lat: 50.1163, lng: -122.9574 },
    // BC Indigenous Communities
    "Musqueam, BC": { lat: 49.2281, lng: -123.1948 },
    "Squamish Nation, BC": { lat: 49.3214, lng: -123.1568 },
    "Tsleil-Waututh, BC": { lat: 49.3000, lng: -122.9500 },
    "Haida Gwaii, BC": { lat: 53.2500, lng: -132.0833 },
    "Alert Bay, BC": { lat: 50.5869, lng: -126.9319 },

    // ============================================
    // ALBERTA
    // ============================================
    "Calgary, AB": { lat: 51.0447, lng: -114.0719 },
    "Edmonton, AB": { lat: 53.5461, lng: -113.4938 },
    "Red Deer, AB": { lat: 52.2690, lng: -113.8115 },
    "Lethbridge, AB": { lat: 49.6937, lng: -112.8418 },
    "Medicine Hat, AB": { lat: 50.0417, lng: -110.6775 },
    "Grande Prairie, AB": { lat: 55.1707, lng: -118.7886 },
    "Airdrie, AB": { lat: 51.2917, lng: -114.0144 },
    "St. Albert, AB": { lat: 53.6301, lng: -113.6258 },
    "Spruce Grove, AB": { lat: 53.5451, lng: -113.9000 },
    "Leduc, AB": { lat: 53.2594, lng: -113.5492 },
    "Fort McMurray, AB": { lat: 56.7267, lng: -111.3798 },
    "Lloydminster, AB": { lat: 53.2807, lng: -110.0050 },
    "Camrose, AB": { lat: 53.0172, lng: -112.8344 },
    "Cold Lake, AB": { lat: 54.4642, lng: -110.1850 },
    "Brooks, AB": { lat: 50.5642, lng: -111.8989 },
    "Banff, AB": { lat: 51.1784, lng: -115.5708 },
    "Canmore, AB": { lat: 51.0884, lng: -115.3479 },
    "Cochrane, AB": { lat: 51.1892, lng: -114.4672 },
    "High River, AB": { lat: 50.5824, lng: -113.8747 },
    "Okotoks, AB": { lat: 50.7286, lng: -113.9817 },
    // Alberta Indigenous Communities
    "Siksika Nation, AB": { lat: 50.8833, lng: -112.9500 },
    "Piikani Nation, AB": { lat: 49.5500, lng: -113.9500 },
    "Kainai Nation, AB": { lat: 49.5833, lng: -113.0167 },
    "Enoch Cree Nation, AB": { lat: 53.5000, lng: -113.6500 },
    "Saddle Lake, AB": { lat: 54.0333, lng: -111.5833 },
    "Maskwacis, AB": { lat: 52.8833, lng: -113.5167 },

    // ============================================
    // SASKATCHEWAN
    // ============================================
    "Saskatoon, SK": { lat: 52.1332, lng: -106.6700 },
    "Regina, SK": { lat: 50.4452, lng: -104.6189 },
    "Prince Albert, SK": { lat: 53.2033, lng: -105.7541 },
    "Moose Jaw, SK": { lat: 50.3934, lng: -105.5519 },
    "Swift Current, SK": { lat: 50.2851, lng: -107.7972 },
    "Yorkton, SK": { lat: 51.2139, lng: -102.4628 },
    "North Battleford, SK": { lat: 52.7575, lng: -108.2861 },
    "Estevan, SK": { lat: 49.1392, lng: -102.9861 },
    "Weyburn, SK": { lat: 49.6608, lng: -103.8514 },
    "Lloydminster, SK": { lat: 53.2807, lng: -110.0050 },
    "Melfort, SK": { lat: 52.8564, lng: -104.6106 },
    "Humboldt, SK": { lat: 52.2017, lng: -105.1233 },
    "La Ronge, SK": { lat: 55.1000, lng: -105.2833 },
    // Saskatchewan Indigenous Communities
    "Standing Buffalo, SK": { lat: 50.7000, lng: -103.7333 },
    "Muskoday First Nation, SK": { lat: 52.8500, lng: -105.3833 },
    "Onion Lake, SK": { lat: 53.7333, lng: -109.9833 },
    "Lac La Ronge, SK": { lat: 55.1667, lng: -105.0667 },
    "Beardy's and Okemasis, SK": { lat: 52.7167, lng: -106.1000 },
    "Red Pheasant, SK": { lat: 52.7917, lng: -108.3167 },
    "Red Pheasant First Nation, SK": { lat: 52.7917, lng: -108.3167 },


    // ============================================
    // MANITOBA
    // ============================================
    "Winnipeg, MB": { lat: 49.8951, lng: -97.1384 },
    "Brandon, MB": { lat: 49.8485, lng: -99.9501 },
    "Steinbach, MB": { lat: 49.5258, lng: -96.6847 },
    "Thompson, MB": { lat: 55.7433, lng: -97.8553 },
    "Portage la Prairie, MB": { lat: 49.9728, lng: -98.2919 },
    "Selkirk, MB": { lat: 50.1436, lng: -96.8839 },
    "Winkler, MB": { lat: 49.1817, lng: -97.9411 },
    "Dauphin, MB": { lat: 51.1492, lng: -100.0503 },
    "Flin Flon, MB": { lat: 54.7681, lng: -101.8781 },
    "The Pas, MB": { lat: 53.8253, lng: -101.2397 },
    "Morden, MB": { lat: 49.1919, lng: -98.1011 },
    // Manitoba Indigenous Communities
    "Peguis First Nation, MB": { lat: 51.1167, lng: -97.4000 },
    "Norway House, MB": { lat: 53.9667, lng: -97.8333 },
    "Cross Lake, MB": { lat: 54.6000, lng: -97.7667 },
    "Garden Hill, MB": { lat: 53.9167, lng: -94.6500 },
    "Sagkeeng First Nation, MB": { lat: 50.6333, lng: -96.2167 },
    "Opaskwayak Cree Nation, MB": { lat: 53.8333, lng: -101.2333 },

    // ============================================
    // ONTARIO
    // ============================================
    "Toronto, ON": { lat: 43.6532, lng: -79.3832 },
    "Ottawa, ON": { lat: 45.4215, lng: -75.6972 },
    "Mississauga, ON": { lat: 43.5890, lng: -79.6441 },
    "Hamilton, ON": { lat: 43.2557, lng: -79.8711 },
    "London, ON": { lat: 42.9849, lng: -81.2453 },
    "Windsor, ON": { lat: 42.3149, lng: -83.0477 },
    "Kingston, ON": { lat: 44.2298, lng: -76.4860 },
    "Sudbury, ON": { lat: 46.4917, lng: -80.9930 },
    "Thunder Bay, ON": { lat: 48.3809, lng: -89.2477 },
    "Brampton, ON": { lat: 43.7315, lng: -79.7624 },
    "Markham, ON": { lat: 43.8561, lng: -79.3370 },
    "Vaughan, ON": { lat: 43.8361, lng: -79.4983 },
    "Richmond Hill, ON": { lat: 43.8828, lng: -79.4403 },
    "Oakville, ON": { lat: 43.4675, lng: -79.6877 },
    "Burlington, ON": { lat: 43.3255, lng: -79.7990 },
    "Oshawa, ON": { lat: 43.8971, lng: -78.8658 },
    "Barrie, ON": { lat: 44.3894, lng: -79.6903 },
    "Guelph, ON": { lat: 43.5448, lng: -80.2482 },
    "Cambridge, ON": { lat: 43.3616, lng: -80.3144 },
    "Kitchener, ON": { lat: 43.4516, lng: -80.4925 },
    "Waterloo, ON": { lat: 43.4643, lng: -80.5204 },
    "St. Catharines, ON": { lat: 43.1594, lng: -79.2469 },
    "Niagara Falls, ON": { lat: 43.0896, lng: -79.0849 },
    "Peterborough, ON": { lat: 44.3091, lng: -78.3197 },
    "Belleville, ON": { lat: 44.1628, lng: -77.3832 },
    "Sarnia, ON": { lat: 42.9745, lng: -82.4066 },
    "Brantford, ON": { lat: 43.1394, lng: -80.2644 },
    "North Bay, ON": { lat: 46.3091, lng: -79.4608 },
    "Sault Ste. Marie, ON": { lat: 46.5136, lng: -84.3358 },
    "Timmins, ON": { lat: 48.4758, lng: -81.3303 },
    "Kenora, ON": { lat: 49.7667, lng: -94.4894 },
    "Orillia, ON": { lat: 44.6082, lng: -79.4197 },
    "Owen Sound, ON": { lat: 44.5690, lng: -80.9434 },
    "Cornwall, ON": { lat: 45.0212, lng: -74.7305 },
    "Chatham-Kent, ON": { lat: 42.4048, lng: -82.1910 },
    // Ontario Indigenous Communities
    "Six Nations, ON": { lat: 43.0500, lng: -80.1167 },
    "Tyendinaga, ON": { lat: 44.1833, lng: -77.1333 },
    "Akwesasne, ON": { lat: 45.0000, lng: -74.6500 },
    "Curve Lake, ON": { lat: 44.4667, lng: -78.3167 },
    "Wikwemikong, ON": { lat: 45.7167, lng: -81.8500 },
    "Garden River, ON": { lat: 46.5500, lng: -84.0833 },
    "Fort William First Nation, ON": { lat: 48.3500, lng: -89.3333 },
    "Wahnapitae First Nation, ON": { lat: 46.5667, lng: -80.8500 },

    // ============================================
    // QUEBEC
    // ============================================
    "Montreal, QC": { lat: 45.5017, lng: -73.5673 },
    "Quebec City, QC": { lat: 46.8139, lng: -71.2080 },
    "Gatineau, QC": { lat: 45.4765, lng: -75.7013 },
    "Sherbrooke, QC": { lat: 45.4042, lng: -71.8929 },
    "Laval, QC": { lat: 45.6066, lng: -73.7124 },
    "Longueuil, QC": { lat: 45.5312, lng: -73.5185 },
    "Trois-Rivières, QC": { lat: 46.3432, lng: -72.5477 },
    "Saguenay, QC": { lat: 48.4279, lng: -71.0687 },
    "Lévis, QC": { lat: 46.8032, lng: -71.1770 },
    "Terrebonne, QC": { lat: 45.6935, lng: -73.6473 },
    "Repentigny, QC": { lat: 45.7421, lng: -73.4671 },
    "Saint-Jean-sur-Richelieu, QC": { lat: 45.3072, lng: -73.2530 },
    "Brossard, QC": { lat: 45.4659, lng: -73.4596 },
    "Drummondville, QC": { lat: 45.8803, lng: -72.4847 },
    "Saint-Jérôme, QC": { lat: 45.7803, lng: -74.0036 },
    "Granby, QC": { lat: 45.4001, lng: -72.7328 },
    "Chicoutimi, QC": { lat: 48.4279, lng: -71.0553 },
    "Rimouski, QC": { lat: 48.4489, lng: -68.5239 },
    "Val-d'Or, QC": { lat: 48.0975, lng: -77.7836 },
    "Rouyn-Noranda, QC": { lat: 48.2394, lng: -79.0225 },
    "Sept-Îles, QC": { lat: 50.2119, lng: -66.3756 },
    "Baie-Comeau, QC": { lat: 49.2167, lng: -68.1500 },
    // Quebec Indigenous Communities
    "Kahnawake, QC": { lat: 45.4000, lng: -73.6833 },
    "Kanesatake, QC": { lat: 45.4833, lng: -74.0833 },
    "Wendake, QC": { lat: 46.8667, lng: -71.3500 },
    "Mashteuiatsh, QC": { lat: 48.5667, lng: -72.2333 },
    "Gesgapegiag, QC": { lat: 48.0667, lng: -66.0667 },
    "Listuguj, QC": { lat: 48.0333, lng: -66.7500 },
    "Kuujjuaq, QC": { lat: 58.1000, lng: -68.4167 },

    // ============================================
    // NEW BRUNSWICK
    // ============================================
    "Fredericton, NB": { lat: 45.9636, lng: -66.6431 },
    "Moncton, NB": { lat: 46.0878, lng: -64.7782 },
    "Saint John, NB": { lat: 45.2733, lng: -66.0635 },
    "Dieppe, NB": { lat: 46.0989, lng: -64.7242 },
    "Riverview, NB": { lat: 46.0614, lng: -64.8053 },
    "Miramichi, NB": { lat: 47.0289, lng: -65.4681 },
    "Edmundston, NB": { lat: 47.3656, lng: -68.3253 },
    "Bathurst, NB": { lat: 47.6197, lng: -65.6503 },
    "Campbellton, NB": { lat: 48.0067, lng: -66.6731 },
    // NB Indigenous Communities
    "Elsipogtog, NB": { lat: 46.6500, lng: -65.0333 },
    "Esgenoopetitj, NB": { lat: 47.0167, lng: -65.4500 },
    "Tobique First Nation, NB": { lat: 46.8000, lng: -67.7000 },

    // ============================================
    // NOVA SCOTIA
    // ============================================
    "Halifax, NS": { lat: 44.6488, lng: -63.5752 },
    "Dartmouth, NS": { lat: 44.6714, lng: -63.5772 },
    "Sydney, NS": { lat: 46.1351, lng: -60.1831 },
    "Truro, NS": { lat: 45.3685, lng: -63.2800 },
    "New Glasgow, NS": { lat: 45.5926, lng: -62.6464 },
    "Glace Bay, NS": { lat: 46.1967, lng: -59.9567 },
    "Kentville, NS": { lat: 45.0774, lng: -64.4943 },
    "Amherst, NS": { lat: 45.8167, lng: -64.2167 },
    "Bridgewater, NS": { lat: 44.3785, lng: -64.5188 },
    "Yarmouth, NS": { lat: 43.8361, lng: -66.1175 },
    // NS Indigenous Communities
    "Membertou, NS": { lat: 46.1333, lng: -60.2000 },
    "Eskasoni, NS": { lat: 45.9333, lng: -60.6333 },
    "Millbrook, NS": { lat: 45.3667, lng: -63.2167 },
    "Sipekne'katik, NS": { lat: 44.9833, lng: -63.6667 },

    // ============================================
    // PRINCE EDWARD ISLAND
    // ============================================
    "Charlottetown, PE": { lat: 46.2382, lng: -63.1311 },
    "Summerside, PE": { lat: 46.3933, lng: -63.7906 },
    "Stratford, PE": { lat: 46.2167, lng: -63.0833 },
    "Cornwall, PE": { lat: 46.2333, lng: -63.2000 },
    // PEI Indigenous Communities
    "Lennox Island, PE": { lat: 46.6000, lng: -63.8333 },
    "Abegweit, PE": { lat: 46.2500, lng: -63.1333 },

    // ============================================
    // NEWFOUNDLAND AND LABRADOR
    // ============================================
    "St. John's, NL": { lat: 47.5615, lng: -52.7126 },
    "Mount Pearl, NL": { lat: 47.5188, lng: -52.8058 },
    "Corner Brook, NL": { lat: 48.9500, lng: -57.9500 },
    "Conception Bay South, NL": { lat: 47.5264, lng: -52.9881 },
    "Grand Falls-Windsor, NL": { lat: 48.9342, lng: -55.6628 },
    "Paradise, NL": { lat: 47.5333, lng: -52.8667 },
    "Gander, NL": { lat: 48.9569, lng: -54.6089 },
    "Happy Valley-Goose Bay, NL": { lat: 53.3017, lng: -60.3261 },
    "Labrador City, NL": { lat: 52.9447, lng: -66.9128 },
    // NL Indigenous Communities
    "Sheshatshiu, NL": { lat: 53.3167, lng: -60.3500 },
    "Natuashish, NL": { lat: 55.9167, lng: -61.1667 },
    "Conne River, NL": { lat: 47.9167, lng: -55.7500 },

    // ============================================
    // YUKON
    // ============================================
    "Whitehorse, YT": { lat: 60.7212, lng: -135.0568 },
    "Dawson City, YT": { lat: 64.0667, lng: -139.4167 },
    "Watson Lake, YT": { lat: 60.0633, lng: -128.7092 },
    "Haines Junction, YT": { lat: 60.7522, lng: -137.5108 },
    // Yukon Indigenous Communities
    "Kwanlin Dün, YT": { lat: 60.7167, lng: -135.0333 },
    "Ta'an Kwäch'än, YT": { lat: 60.7500, lng: -135.0500 },
    "Champagne and Aishihik, YT": { lat: 60.7500, lng: -137.5000 },
    "Tr'ondëk Hwëch'in, YT": { lat: 64.0600, lng: -139.4300 },

    // ============================================
    // NORTHWEST TERRITORIES
    // ============================================
    "Yellowknife, NT": { lat: 62.4540, lng: -114.3718 },
    "Hay River, NT": { lat: 60.8156, lng: -115.7125 },
    "Inuvik, NT": { lat: 68.3607, lng: -133.7230 },
    "Fort Smith, NT": { lat: 60.0044, lng: -111.8864 },
    "Behchoko, NT": { lat: 62.8028, lng: -116.0464 },
    "Fort Simpson, NT": { lat: 61.8628, lng: -121.3536 },
    // NWT Indigenous Communities
    "Dettah, NT": { lat: 62.4500, lng: -114.2333 },
    "Ndilo, NT": { lat: 62.4500, lng: -114.3833 },
    "Lutselk'e, NT": { lat: 62.4000, lng: -110.7333 },
    "Tulita, NT": { lat: 64.9000, lng: -125.5833 },

    // ============================================
    // NUNAVUT
    // ============================================
    "Iqaluit, NU": { lat: 63.7467, lng: -68.5170 },
    "Rankin Inlet, NU": { lat: 62.8094, lng: -92.0853 },
    "Arviat, NU": { lat: 61.1078, lng: -94.0628 },
    "Baker Lake, NU": { lat: 64.3167, lng: -96.0333 },
    "Cambridge Bay, NU": { lat: 69.1169, lng: -105.0597 },
    "Pond Inlet, NU": { lat: 72.6969, lng: -77.9586 },
    "Pangnirtung, NU": { lat: 66.1451, lng: -65.6992 },
    "Igloolik, NU": { lat: 69.3772, lng: -81.7989 },
    "Kugluktuk, NU": { lat: 67.8261, lng: -115.0964 },
    "Cape Dorset, NU": { lat: 64.2300, lng: -76.5400 },
    "Gjoa Haven, NU": { lat: 68.6356, lng: -95.8783 },
};

// Province/Territory abbreviation mappings
export const PROVINCE_ABBREVIATIONS: Record<string, string> = {
    "BC": "British Columbia",
    "AB": "Alberta",
    "SK": "Saskatchewan",
    "MB": "Manitoba",
    "ON": "Ontario",
    "QC": "Quebec",
    "NB": "New Brunswick",
    "NS": "Nova Scotia",
    "PE": "Prince Edward Island",
    "NL": "Newfoundland and Labrador",
    "YT": "Yukon",
    "NT": "Northwest Territories",
    "NU": "Nunavut",
};

// Province/Territory center coordinates for fallback
export const PROVINCE_CENTERS: Record<string, Coordinates> = {
    "British Columbia": { lat: 53.7267, lng: -127.6476 },
    "Alberta": { lat: 53.9333, lng: -116.5765 },
    "Saskatchewan": { lat: 52.9399, lng: -106.4509 },
    "Manitoba": { lat: 53.7609, lng: -98.8139 },
    "Ontario": { lat: 51.2538, lng: -85.3232 },
    "Quebec": { lat: 52.9399, lng: -73.5491 },
    "New Brunswick": { lat: 46.5653, lng: -66.4619 },
    "Nova Scotia": { lat: 44.6820, lng: -63.7443 },
    "Prince Edward Island": { lat: 46.2500, lng: -63.0000 },
    "Newfoundland and Labrador": { lat: 53.1355, lng: -57.6604 },
    "Yukon": { lat: 64.2823, lng: -135.0000 },
    "Northwest Territories": { lat: 64.8255, lng: -124.8457 },
    "Nunavut": { lat: 70.2998, lng: -83.1076 },
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

    // 2. Build lowercase lookup map
    const lowerMap = new Map<string, Coordinates>();
    for (const [key, coords] of Object.entries(CANADIAN_CITIES)) {
        lowerMap.set(key.toLowerCase(), coords);
    }

    // 3. Case-insensitive full match
    if (lowerMap.has(normalized.toLowerCase())) {
        return lowerMap.get(normalized.toLowerCase())!;
    }

    // 4. Try matching city name only (e.g., "Toronto" matches "Toronto, ON")
    const normalizedLower = normalized.toLowerCase();
    for (const [key, coords] of Object.entries(CANADIAN_CITIES)) {
        const cityName = key.split(',')[0].trim().toLowerCase();
        if (cityName === normalizedLower) {
            return coords;
        }
    }

    // 5. Try matching with common variations
    // Handle "City, Province" vs "City, XX" format
    const parts = normalized.split(',').map(p => p.trim());
    if (parts.length >= 2) {
        const city = parts[0];
        const province = parts[1].toUpperCase();

        // Try with full province name
        const fullProvince = PROVINCE_ABBREVIATIONS[province];
        if (fullProvince) {
            const tryKey = `${city}, ${province}`;
            if (lowerMap.has(tryKey.toLowerCase())) {
                return lowerMap.get(tryKey.toLowerCase())!;
            }
        }
    }

    // 6. Fuzzy match - find cities that start with the search term
    for (const [key, coords] of Object.entries(CANADIAN_CITIES)) {
        const cityName = key.split(',')[0].trim().toLowerCase();
        if (cityName.startsWith(normalizedLower)) {
            return coords;
        }
    }

    // 7. Try matching province/region as fallback
    for (const [abbr, fullName] of Object.entries(PROVINCE_ABBREVIATIONS)) {
        if (normalizedLower.includes(abbr.toLowerCase()) ||
            normalizedLower.includes(fullName.toLowerCase())) {
            return PROVINCE_CENTERS[fullName] || null;
        }
    }

    return null;
}

/**
 * Get all cities for autocomplete suggestions
 */
export function getCitySuggestions(query: string, limit: number = 10): string[] {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const matches: string[] = [];

    for (const city of Object.keys(CANADIAN_CITIES)) {
        if (city.toLowerCase().includes(queryLower)) {
            matches.push(city);
            if (matches.length >= limit) break;
        }
    }

    // Sort by relevance (starts with query first)
    return matches.sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(queryLower);
        const bStarts = b.toLowerCase().startsWith(queryLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
    });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(coord2.lat - coord1.lat);
    const dLng = toRadians(coord2.lng - coord1.lng);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    if (km < 10) {
        return `${km.toFixed(1)} km`;
    }
    return `${Math.round(km)} km`;
}

/**
 * Filter items by radius from a center point
 */
export function filterByRadius<T extends { coordinates?: Coordinates | null }>(
    items: T[],
    center: Coordinates,
    radiusKm: number
): (T & { distance: number })[] {
    return items
        .filter(item => item.coordinates != null)
        .map(item => ({
            ...item,
            distance: calculateDistance(center, item.coordinates!),
        }))
        .filter(item => item.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
}

/**
 * Sort items by distance from a center point
 */
export function sortByDistance<T extends { coordinates?: Coordinates | null }>(
    items: T[],
    center: Coordinates
): (T & { distance: number })[] {
    return items
        .filter(item => item.coordinates != null)
        .map(item => ({
            ...item,
            distance: calculateDistance(center, item.coordinates!),
        }))
        .sort((a, b) => a.distance - b.distance);
}

/**
 * Get the total count of cities in the geocoding database
 */
export function getCityCount(): number {
    return Object.keys(CANADIAN_CITIES).length;
}

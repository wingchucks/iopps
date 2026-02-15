/**
 * Map Types Module
 * Defines types for the Enhanced Opportunity Map feature
 */

import type { Coordinates } from '../static-geocoding';

// Content types that can appear on the map
export type MapContentType = 'job' | 'conference' | 'school' | 'training' | 'powwow' | 'vendor';

// High-level categories for filtering
export type MapCategory = 'jobs' | 'events' | 'businesses' | 'education';

// Mapping from content type to category
export const contentTypeToCategory: Record<MapContentType, MapCategory> = {
  job: 'jobs',
  training: 'jobs',
  conference: 'events',
  powwow: 'events',
  vendor: 'businesses',
  school: 'education',
};

// Mapping from category to content types
export const categoryToContentTypes: Record<MapCategory, MapContentType[]> = {
  jobs: ['job', 'training'],
  events: ['conference', 'powwow'],
  businesses: ['vendor'],
  education: ['school'],
};

// Color scheme for markers
export const markerColors: Record<MapCategory, string> = {
  jobs: '#3B82F6',      // Blue
  events: '#22C55E',    // Green
  businesses: '#F97316', // Orange
  education: '#A855F7',  // Purple
};

// Display labels
export const contentTypeLabels: Record<MapContentType, string> = {
  job: 'Job',
  conference: 'Conference',
  school: 'School',
  training: 'Training Program',
  powwow: 'Pow Wow',
  vendor: 'Business',
};

export const categoryLabels: Record<MapCategory, string> = {
  jobs: 'Jobs & Training',
  events: 'Events',
  businesses: 'Businesses',
  education: 'Education',
};

/**
 * Unified map opportunity item
 * Represents any location-based content on the map
 */
export interface MapOpportunity {
  id: string;
  type: MapContentType;
  category: MapCategory;
  title: string;
  organization: string;
  location: string;
  coordinates: Coordinates;
  url: string;
  featured?: boolean;
  // Type-specific metadata
  meta: {
    // Job-specific
    employmentType?: string;
    salary?: string;
    deadline?: string;
    // Conference/Event-specific
    date?: string;
    startDate?: string;
    endDate?: string;
    venue?: string;
    // School-specific
    programs?: string;
    campusCount?: number;
    // Training-specific
    format?: string;
    duration?: string;
    // Vendor-specific
    vendorType?: string;
    services?: string;
    // Pow Wow-specific
    region?: string;
  };
  // Distance from user (populated when near filter is used)
  distance?: number;
}

/**
 * Filter options for the map
 */
export interface MapFilters {
  // Filter by specific content types
  types?: MapContentType[];
  // Filter by category (overrides types if set)
  category?: MapCategory;
  // Text search
  search?: string;
  // Proximity filter
  near?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  // Only show featured items
  featuredOnly?: boolean;
}

/**
 * API response for map opportunities
 */
export interface MapOpportunitiesResponse {
  opportunities: MapOpportunity[];
  counts: {
    total: number;
    byCategory: Record<MapCategory, number>;
    byType: Record<MapContentType, number>;
  };
  // If near filter applied, these are populated
  center?: Coordinates;
  radiusKm?: number;
}

/**
 * Map view state (for URL sync)
 */
export interface MapViewState {
  // Map center
  center: Coordinates;
  // Zoom level
  zoom: number;
  // Active filters
  filters: MapFilters;
  // View mode
  view: 'map' | 'list';
  // Selected opportunity (for popup)
  selectedId?: string;
}

/**
 * Radius options for proximity search
 */
export const radiusOptions = [
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 250, label: '250 km' },
] as const;

export type RadiusOption = typeof radiusOptions[number]['value'];

/**
 * Default map center (Canada geographic center)
 */
export const DEFAULT_MAP_CENTER: Coordinates = {
  lat: 56.1304,
  lng: -106.3468,
};

/**
 * Default zoom levels
 */
export const DEFAULT_ZOOM = 4;
export const CITY_ZOOM = 12;
export const PROVINCE_ZOOM = 6;

/**
 * Helper to get marker color for a content type
 */
export function getMarkerColor(type: MapContentType): string {
  const category = contentTypeToCategory[type];
  return markerColors[category];
}

/**
 * Helper to check if an opportunity matches filters
 */
export function matchesFilters(opportunity: MapOpportunity, filters: MapFilters): boolean {
  // Category filter
  if (filters.category && opportunity.category !== filters.category) {
    return false;
  }

  // Type filter
  if (filters.types && filters.types.length > 0) {
    if (!filters.types.includes(opportunity.type)) {
      return false;
    }
  }

  // Featured filter
  if (filters.featuredOnly && !opportunity.featured) {
    return false;
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    const searchableText = [
      opportunity.title,
      opportunity.organization,
      opportunity.location,
      ...Object.values(opportunity.meta).filter(Boolean),
    ].join(' ').toLowerCase();

    if (!searchableText.includes(searchLower)) {
      return false;
    }
  }

  return true;
}

/**
 * Helper to serialize filters to URL params
 */
export function filtersToParams(filters: MapFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.types && filters.types.length > 0) {
    params.set('types', filters.types.join(','));
  }

  if (filters.category) {
    params.set('category', filters.category);
  }

  if (filters.search) {
    params.set('search', filters.search);
  }

  if (filters.near) {
    params.set('lat', filters.near.lat.toString());
    params.set('lng', filters.near.lng.toString());
    params.set('radius', filters.near.radiusKm.toString());
  }

  if (filters.featuredOnly) {
    params.set('featured', 'true');
  }

  return params;
}

/**
 * Helper to parse filters from URL params
 */
export function paramsToFilters(params: URLSearchParams): MapFilters {
  const filters: MapFilters = {};

  const types = params.get('types');
  if (types) {
    filters.types = types.split(',') as MapContentType[];
  }

  const category = params.get('category');
  if (category && ['jobs', 'events', 'businesses', 'education'].includes(category)) {
    filters.category = category as MapCategory;
  }

  const search = params.get('search');
  if (search) {
    filters.search = search;
  }

  const lat = params.get('lat');
  const lng = params.get('lng');
  const radius = params.get('radius');
  if (lat && lng && radius) {
    filters.near = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseInt(radius, 10),
    };
  }

  const featured = params.get('featured');
  if (featured === 'true') {
    filters.featuredOnly = true;
  }

  return filters;
}

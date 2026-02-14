// Service contact resolution helper
// Determines the correct contact info for a service, falling back to org profile when useOrgContact is true

import type { Service, EmployerProfile } from "@/lib/types";

export interface ServiceContactInfo {
  email?: string;
  phone?: string;
  website?: string;
  bookingUrl?: string;
  linkedin?: string;
}

/**
 * Get contact information for a service.
 *
 * When useOrgContact is true (or undefined for backward compat),
 * falls back to org profile contact info if service doesn't have its own.
 *
 * @param service - The service document
 * @param orgProfile - Optional organization profile (required if service uses org contact)
 * @returns Resolved contact information
 */
export function getServiceContact(
  service: Service,
  orgProfile?: EmployerProfile | null
): ServiceContactInfo {
  // If useOrgContact is explicitly false, only use service's own contact info
  if (service.useOrgContact === false) {
    return {
      email: service.email,
      phone: service.phone,
      website: service.website,
      bookingUrl: service.bookingUrl,
      linkedin: service.linkedin,
    };
  }

  // useOrgContact is true or undefined (backward compat treats undefined as true)
  // Fall back to org profile for any missing fields
  return {
    email: service.email || orgProfile?.contactEmail,
    phone: service.phone || orgProfile?.contactPhone,
    website: service.website || orgProfile?.website,
    bookingUrl: service.bookingUrl,
    linkedin: service.linkedin || orgProfile?.socialLinks?.linkedin,
  };
}

/**
 * Check if a service has any contact info available
 */
export function hasContactInfo(contact: ServiceContactInfo): boolean {
  return !!(contact.email || contact.phone || contact.website || contact.bookingUrl || contact.linkedin);
}

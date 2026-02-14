# Conference Pillar Enhancement Plan

## Vision
Transform the conference section into the most comprehensive Indigenous professional conference platform in Canada, where users can discover events, learn everything they need to know before attending, and connect with organizers and fellow attendees.

---

## Current State Analysis

### What Exists
- **List page**: Basic filtering (keyword, location, timeframe, cost, sort)
- **Detail page**: Title, organizer, location, dates, cost, description, registration link
- **Employer dashboard**: Create/edit conferences, toggle active status
- **Pricing**: Standard ($49) vs Featured ($99) listings
- **Conference type fields**: id, employerId, employerName, organizerName, title, description, location, startDate, endDate, registrationLink/Url, cost, format, active, featured, viewsCount

### What's Missing
Users currently see minimal information - just enough to know a conference exists, but not enough to make an informed decision about attending.

---

## Enhancement Plan

### Phase 1: Rich Conference Data Model

**Extend the Conference type** (`lib/types.ts`) with new fields:

```typescript
export interface Conference {
  // ... existing fields ...

  // Rich Media
  bannerImageUrl?: string;
  galleryImageUrls?: string[];
  promoVideoUrl?: string;

  // Venue Details
  venue?: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode?: string;
    mapUrl?: string;
    parkingInfo?: string;
    transitInfo?: string;
    accessibilityInfo?: string;
  };

  // Schedule & Agenda
  agenda?: AgendaDay[];

  // Speakers
  speakers?: Speaker[];

  // Registration Options
  registrationOptions?: {
    earlyBirdPrice?: string;
    earlyBirdDeadline?: Timestamp | string;
    regularPrice?: string;
    groupRate?: string;
    groupMinimum?: number;
    indigenousRate?: string;
    studentRate?: string;
    virtualPrice?: string;
  };

  // Event Details
  eventType?: 'in-person' | 'virtual' | 'hybrid';
  livestreamUrl?: string;
  virtualPlatform?: string;
  expectedAttendees?: string;
  targetAudience?: string[];
  topics?: string[];

  // Indigenous-Specific
  trc92Commitment?: boolean;
  indigenousProtocols?: string;
  elderAcknowledgement?: string;
  territoryAcknowledgement?: string;
  indigenousLanguageSupport?: string[];

  // Accessibility
  accessibilityFeatures?: string[];

  // Sponsors
  sponsors?: Sponsor[];

  // FAQ
  faqs?: FAQ[];

  // Contact
  contactEmail?: string;
  contactPhone?: string;

  // Social
  socialLinks?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };

  // Analytics
  registrationClicks?: number;
  savedCount?: number;
}

export interface AgendaDay {
  date: string;
  sessions: AgendaSession[];
}

export interface AgendaSession {
  id: string;
  time: string;
  endTime?: string;
  title: string;
  description?: string;
  speakerIds?: string[];
  location?: string;
  track?: string;
  type?: 'keynote' | 'workshop' | 'panel' | 'networking' | 'break' | 'ceremony';
}

export interface Speaker {
  id: string;
  name: string;
  title?: string;
  organization?: string;
  bio?: string;
  photoUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  topics?: string[];
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'community';
  description?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}
```

---

### Phase 2: Enhanced Conference Detail Page

**New sections for** `app/conferences/[conferenceId]/page.tsx`:

#### 2.1 Hero Section (Redesigned)
- Full-width banner image with overlay
- Conference title, dates, location badge
- Featured/TRC#92 badges
- "Save Conference" button (with calendar export)
- Registration CTA button
- Share buttons

#### 2.2 Quick Facts Sidebar
- Event type badge (In-person/Virtual/Hybrid)
- Date & time with timezone
- Venue name with map link
- Cost tiers (early bird, regular, student)
- Expected attendance
- Registration deadline countdown

#### 2.3 About Section
- Full description with rich text support
- Target audience tags
- Topic/theme tags

#### 2.4 Schedule/Agenda Section (NEW)
- Day-by-day accordion
- Session cards with time, title, speaker, room
- Track filtering (if multiple tracks)
- Session type icons (keynote, workshop, panel, networking, break)
- Expandable session details

#### 2.5 Speakers Section (NEW)
- Speaker grid with photos
- Expandable bio on click/tap
- Social links
- Sessions they're presenting

#### 2.6 Venue & Travel Section (NEW)
- Embedded Google Map
- Venue details card
- Parking information
- Public transit information
- Nearby hotels suggestion
- Accessibility features list

#### 2.7 Registration Options Section (NEW)
- Pricing table
- Early bird deadline countdown
- Indigenous/student/group rates highlighted
- Clear CTA to register

#### 2.8 Indigenous Protocols Section (NEW - conditional)
- Territory acknowledgement
- Elder acknowledgement
- Cultural protocols for attendees
- Language support information
- TRC #92 commitment statement

#### 2.9 Sponsors Section (NEW - conditional)
- Tiered sponsor logos
- Link to sponsor websites
- "Become a Sponsor" CTA

#### 2.10 FAQ Section (NEW - conditional)
- Accordion-style Q&A
- Common questions about registration, refunds, dress code, etc.

#### 2.11 Contact Section
- Organizer contact information
- Social media links
- "Ask a Question" form (optional)

#### 2.12 Related Conferences Section (NEW)
- Similar conferences by topic/location
- Other conferences by same organizer

---

### Phase 3: Enhanced Conference List Page

**Improvements to** `app/conferences/page.tsx`:

#### 3.1 Enhanced Cards
- Banner image thumbnails
- Speaker count badge
- Event type indicator (in-person/virtual/hybrid)
- "Indigenous-focused" badge
- Save/bookmark button

#### 3.2 New Filters
- Event type filter (in-person/virtual/hybrid)
- Topic/category filter
- Indigenous-focused toggle
- Province/region filter
- Date range picker

#### 3.3 Map View (NEW)
- Toggle between list and map view
- Conference markers on map
- Click marker to see preview card

#### 3.4 Featured Conferences Carousel
- Highlighted featured conferences at top
- Auto-rotate with manual controls

---

### Phase 4: Employer Conference Creation Enhancement

**Update** `app/organization/conferences/new/page.tsx` and create edit page:

#### 4.1 Multi-Step Form
Step 1: Basic Info (title, description, dates, location)
Step 2: Venue Details (address, map, parking, accessibility)
Step 3: Registration & Pricing (tiers, deadlines, links)
Step 4: Agenda Builder (visual schedule creator)
Step 5: Speakers (add/import speakers)
Step 6: Media (banner, gallery, promo video)
Step 7: Indigenous Protocols (TRC#92, acknowledgements)
Step 8: Sponsors & FAQ
Step 9: Preview & Publish

#### 4.2 Agenda Builder Component (NEW)
- Drag-and-drop schedule creator
- Add sessions with time slots
- Assign speakers to sessions
- Define tracks

#### 4.3 Speaker Manager Component (NEW)
- Add speakers with photo upload
- Import from LinkedIn (future)
- Reuse speakers across conferences

#### 4.4 Sponsor Manager Component (NEW)
- Add sponsors with logo upload
- Define sponsor tiers

---

### Phase 5: User Features

#### 5.1 Save/Bookmark Conferences
- Save conferences to profile
- View saved conferences in dashboard
- Get reminders before events

#### 5.2 Calendar Export
- Export to Google Calendar
- Export to iCal/Outlook
- Add all sessions at once option

#### 5.3 Conference Reminders
- Email reminders before event
- 1 week, 1 day, 1 hour before options
- Registration deadline reminders

---

### Phase 6: Analytics & Insights (For Organizers)

#### 6.1 Conference Analytics Dashboard
- Page views over time
- Registration link clicks
- Save/bookmark count
- Traffic sources
- Popular sessions (if agenda exists)

---

## Implementation Priority

### Must Have (Phase 1 MVP)
1. Extended Conference type with venue, agenda, speakers fields
2. Redesigned detail page with hero, agenda, speakers, venue sections
3. Enhanced list page cards with images and badges
4. Calendar export functionality
5. Basic save/bookmark feature

### Should Have (Phase 2)
1. Multi-step conference creation form
2. Agenda builder component
3. Speaker manager component
4. Indigenous protocols section
5. Map view on list page
6. Related conferences section

### Nice to Have (Phase 3)
1. Conference analytics dashboard
2. Email reminders system
3. Sponsor management
4. FAQ builder
5. Rich text editor for descriptions

---

## File Changes Summary

### New Files to Create
- `components/conferences/ConferenceHero.tsx`
- `components/conferences/ConferenceAgenda.tsx`
- `components/conferences/ConferenceSpeakers.tsx`
- `components/conferences/ConferenceVenue.tsx`
- `components/conferences/ConferenceRegistration.tsx`
- `components/conferences/ConferenceProtocols.tsx`
- `components/conferences/ConferenceSponsors.tsx`
- `components/conferences/ConferenceFAQ.tsx`
- `components/conferences/ConferenceSidebar.tsx`
- `components/conferences/ConferenceCard.tsx` (enhanced)
- `components/conferences/CalendarExport.tsx`
- `components/conferences/AgendaBuilder.tsx` (for employer)
- `components/conferences/SpeakerManager.tsx` (for employer)

### Files to Modify
- `lib/types.ts` - Extended Conference type
- `app/conferences/page.tsx` - Enhanced list view
- `app/conferences/[conferenceId]/page.tsx` - Complete redesign
- `app/organization/conferences/new/page.tsx` - Multi-step form
- `app/organization/conferences/[conferenceId]/edit/page.tsx` - Multi-step form
- `lib/firestore.ts` - New functions for conference features

---

## Design Principles

1. **Information Architecture**: Group related info, use progressive disclosure
2. **Mobile First**: All features work great on mobile
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Performance**: Lazy load images, paginate large agendas
5. **Consistency**: Match existing IOPPS design system
6. **Indigenous-Centered**: Highlight cultural elements prominently

---

## Questions for User Before Implementation

1. Do you want to start with the detail page redesign or the data model extension first?
2. Should we prioritize the agenda/speakers feature or the venue/map feature?
3. Do you have any existing conferences with data we should migrate?
4. What's your timeline preference - MVP first then iterate, or full feature build?

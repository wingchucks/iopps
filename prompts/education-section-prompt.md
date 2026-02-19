# IOPPS Education Section - Design & Implementation

## Goal
Unify the "Education" nav, "View Training" button, and "Build Skills" card into one combined section for all learning opportunities — from 1-day safety tickets to 4-year degrees.

## Existing UI Integration
- **Nav "Education"** → goes to /education (combined listings)
- **Hero "View Training" button** → goes to /education  
- **"Build Skills" card** → goes to /education
- Card description: "Access training from Indigenous institutions — professional, trades, and cultural."

## Data Model - Education Listing

```typescript
interface EducationListing {
  id: string;
  title: string;
  
  // Provider info
  provider: {
    name: string;
    logo?: string;
    website?: string;
  };
  
  // Classification
  type: "training" | "certificate" | "diploma" | "degree" | "workshop" | "bootcamp";
  level: "beginner" | "intermediate" | "advanced";
  
  // Duration
  duration: {
    value: number;
    unit: "hours" | "days" | "weeks" | "months" | "years";
  };
  
  // Delivery
  format: "online" | "in-person" | "hybrid";
  location?: string; // if in-person
  
  // Cost & Funding
  cost: {
    amount: number; // 0 for free
    funded: boolean;
    fundingSource?: string; // e.g., "Band funding available", "ISET eligible"
  };
  
  // Details
  description: string;
  skills: string[]; // tags for matching to jobs
  field: string; // industry/career field
  prerequisites?: string;
  
  // Dates
  nextStartDate?: Date;
  applicationDeadline?: Date;
  
  // Actions
  applyUrl: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

## Filters

| Filter | Options |
|--------|---------|
| **Category** | All Categories, Training, Certificate, Diploma, Degree, Workshop, Bootcamp |
| **Level** | All Levels, Beginner, Intermediate, Advanced |
| **Format** | All Formats, Online, In-Person, Hybrid |
| **Duration** | All, Quick (<1 week), Short (1-12 weeks), Medium (3-12 months), Long (1+ year) |
| **Cost** | All, Free, Funded, Paid |
| **Field** | Multi-select dropdown (Healthcare, Trades, Business, Technology, etc.) |

## Sort Options
- Starting Soon
- Duration (shortest first)
- Newest Added
- Alphabetical

## Sources to Scrape/Import

### Saskatchewan
- **SIIT** - Programs, JobSeries, Quick Skills
- **Saskatchewan Polytechnic** - Indigenous programs
- **First Nations University of Canada**
- **Rupertsland Institute** - Métis Training to Employment

### National
- **CCIB** - Tools for Indigenous Business, Capital Skills, Mini-MBA
- **Government of Canada** - Skills Link Program, Summer Work Experience
- **TECHNATION** - Indigenous Pathways (tech)
- **Provincial apprenticeship boards**

### To Research
- Tribal council training programs
- Band-specific training initiatives
- Industry certification providers (safety tickets, etc.)

## User Flow

1. **Browse** - User lands on /education, sees all listings with filters
2. **Filter** - Narrow by type, duration, format, field
3. **View Details** - See full program info, requirements, dates
4. **Apply** - Click through to external application (or save for later)
5. **Related Jobs** - See job postings that match the skills taught

## Features to Consider

- **Skill Matching**: Show which jobs on IOPPS require skills taught in this program
- **Funding Calculator**: Help users understand what funding they might qualify for
- **Start Date Alerts**: Notify users when application deadlines approach
- **Provider Profiles**: Dedicated pages for institutions with all their offerings
- **User Progress**: Track completed training in "My Dashboard"

## Page Layout

### /education (listing page)
- Hero: "Build Your Skills" with search bar
- Filters sidebar (or top bar on mobile)
- Grid/list of education cards
- Each card shows: Title, Provider, Type badge, Duration, Format, Cost

### /education/[id] (detail page)
- Provider logo + name
- Title, type badge
- Key info: Duration, Format, Location, Cost
- Full description
- Prerequisites
- Start dates / How to apply
- Related jobs section
- Similar programs section

---

*Last updated: January 30, 2026*

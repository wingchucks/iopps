# Partner Showcase Innovation Plan

## The Vision

IOPPS isn't just a job board. You **interview companies**. You **create content**. You build **relationships**.

The partner showcase shouldn't just display logos—it should tell stories, feature voices, and create a media experience that makes partners feel like celebrities and job seekers feel connected.

---

## Current State

✅ Logo carousel (Phase 1) - DONE
- Auto-scrolling partner logos on homepage
- Grayscale → color on hover
- Links to employer profiles

**What's missing:** The human element. The stories. The videos.

---

## Innovation Options

### Option A: "Partner Spotlight" Hero Section

**The Concept:** A rotating, video-first showcase that features one partner at a time with their interview clip, quote, and story.

```
┌─────────────────────────────────────────────────────────────────┐
│  ✨ PARTNER SPOTLIGHT                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  ┌────────────────┐                                      │  │
│  │  │   ▶️ VIDEO     │   "We've hired 15 Indigenous team   │  │
│  │  │   THUMBNAIL    │    members through IOPPS. It's      │  │
│  │  │   (hover play) │    changed our company culture."    │  │
│  │  └────────────────┘                                      │  │
│  │                         — Sarah Chen, CEO TechCorp       │  │
│  │                                                          │  │
│  │  [ Watch Full Interview ]  [ View 8 Open Jobs ]          │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                      ○ ○ ● ○ ○ (auto-rotate every 10s)          │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Auto-rotates through partners with IOPPS interviews
- Video thumbnail plays on hover (first 15 seconds)
- Pull quote extracted from interview
- Direct links to full interview + their jobs
- "Featured Partner of the Week" option for premium tier

**Why it's different:**
- Shows the human behind the company
- Video-first in a text-heavy industry
- Creates FOMO for partners without interviews ("I want that spotlight")

**Effort:** Medium (3-4 days)

---

### Option B: "Fresh From The Studio" Interview Feed

**The Concept:** A podcast/media-style section showcasing recent IOPPS interviews like a content feed.

```
┌─────────────────────────────────────────────────────────────────┐
│  🎙️ FRESH FROM THE STUDIO                                      │
│     Latest conversations with partner organizations             │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ ▶️          │ │ ▶️          │ │ ▶️          │ │ ▶️        │ │
│  │ [Thumbnail] │ │ [Thumbnail] │ │ [Thumbnail] │ │ [Thumb]   │ │
│  │             │ │             │ │             │ │           │ │
│  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├───────────┤ │
│  │ TechCorp    │ │ HealthFirst │ │ BuildRight  │ │ GovCan    │ │
│  │ "Why We     │ │ "Healthcare │ │ "Trades     │ │ "Public   │ │
│  │  Hire..."   │ │  Careers"   │ │  Careers"   │ │  Service" │ │
│  │ 12:34 • 2d  │ │ 8:45 • 5d   │ │ 15:20 • 1w  │ │ 10:12•2w  │ │
│  │ 1.2k views  │ │ 890 views   │ │ 2.1k views  │ │ 650 views │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│                                                                 │
│            [ Watch All Interviews → ]  🔔 Subscribe             │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Horizontal scrollable feed of recent interviews
- Video duration and view count displayed
- "New" badge for interviews < 7 days old
- Click → opens video in modal or goes to interview page
- Subscribe button links to YouTube channel
- Could integrate actual YouTube API data

**Why it's different:**
- Positions IOPPS as a **media company**, not just a job board
- Creates ongoing content consumption
- Partners see their interview getting views (social proof)
- Job seekers learn about company cultures before applying

**Effort:** Medium (3-4 days)

---

### Option C: "Partner Stories" Expandable Cards

**The Concept:** Rich, expandable partner cards that reveal video, quotes, stats, and jobs on interaction.

```
COLLAPSED STATE:
┌─────────────────────────────────────────────────────────────────┐
│  🤝 PARTNER STORIES                                             │
│                                                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│  │ [Logo]           │ │ [Logo]           │ │ [Logo]           ││
│  │ TechCorp Canada  │ │ HealthFirst      │ │ BuildRight Inc   ││
│  │ Technology • Van │ │ Healthcare • Tor │ │ Construction•Cal ││
│  │ 🎥 Interview     │ │ 🎥 Interview     │ │ 💼 12 Jobs       ││
│  │ [Expand ↓]       │ │ [Expand ↓]       │ │ [Expand ↓]       ││
│  └──────────────────┘ └──────────────────┘ └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘

EXPANDED STATE (click one card):
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Logo]  TechCorp Canada                    [Close ×]       │ │
│  │         Technology • Vancouver • 201-500 employees         │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │                                                     │  │ │
│  │  │              ▶️ IOPPS INTERVIEW                     │  │ │
│  │  │           "Building Indigenous Tech Talent"         │  │ │
│  │  │                   12:34 • 2.1k views                │  │ │
│  │  │                                                     │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  │                                                            │ │
│  │  💬 "Partnering with IOPPS has transformed how we         │ │
│  │      approach talent acquisition. We've hired 15          │ │
│  │      incredible team members."                            │ │
│  │                                                            │ │
│  │  📊 Impact: 15 hires • 23 applications • Partner since 2023│ │
│  │                                                            │ │
│  │  💼 Open Positions:                                        │ │
│  │     • Senior Developer (Remote) - $95k-120k               │ │
│  │     • UX Designer (Vancouver) - $75k-90k                  │ │
│  │     • + 10 more positions                                 │ │
│  │                                                            │ │
│  │  [ View All Jobs ]  [ Visit Website ]  [ Watch Interview ] │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Collapsed: Logo, name, industry, location, interview badge
- Expanded: Full video player, quote, stats, job listings
- Smooth expand/collapse animation
- Deep engagement without leaving homepage
- Shows real impact metrics (hires, applications)

**Why it's different:**
- Interactive and explorable
- Everything about a partner in one place
- Shows IMPACT, not just presence
- Makes partners feel valued with stats

**Effort:** High (5-7 days)

---

### Option D: "Video Wall" Netflix-Style Grid

**The Concept:** A cinematic video wall where every tile is a partner interview that plays on hover.

```
┌─────────────────────────────────────────────────────────────────┐
│  🎬 MEET OUR PARTNERS                                           │
│     Hear directly from organizations committed to Indigenous    │
│     hiring                                                      │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │▶️       │ │▶️       │ │▶️       │ │▶️       │ │▶️       │  │
│  │         │ │ PLAYING │ │         │ │         │ │         │  │
│  │TechCorp │ │HealthFi │ │BuildRt  │ │ GovCan  │ │EduFirst │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │▶️       │ │▶️       │ │▶️       │ │▶️       │ │    +    │  │
│  │         │ │         │ │         │ │         │ │  MORE   │  │
│  │FinServ  │ │ Mining  │ │ Retail  │ │ Legal   │ │         │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                                 │
│  Currently Playing: HealthFirst - "Healthcare Careers for..."   │
│  [ Full Screen ]  [ View All Interviews ]                       │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Grid of video thumbnails (YouTube-sourced or stored)
- Hover → auto-plays muted preview (like Netflix)
- Click → opens full interview
- Sound icon appears on hover
- "Currently playing" bar shows active video
- Responsive: 5 cols desktop, 3 tablet, 2 mobile

**Why it's different:**
- Cinematic, immersive experience
- Treats partner interviews as premium content
- Encourages exploration
- "Binge-worthy" partner discovery

**Effort:** High (5-7 days)

---

## Comparison Matrix

| Feature | Option A: Spotlight | Option B: Studio Feed | Option C: Story Cards | Option D: Video Wall |
|---------|--------------------|-----------------------|----------------------|---------------------|
| **Visual Impact** | High | Medium-High | High | Very High |
| **Video Integration** | Single featured | Horizontal list | Embedded in cards | Full grid |
| **Interactivity** | Auto-rotate | Scroll + click | Expand/collapse | Hover preview |
| **Partner Value** | Featured rotation | Content showcase | Deep profile | Equal visibility |
| **Job Seeker Value** | Discover one | Browse content | Research deeply | Explore many |
| **Development Time** | 3-4 days | 3-4 days | 5-7 days | 5-7 days |
| **Uniqueness** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## My Recommendation

**Start with Option B: "Fresh From The Studio"** because:

1. **Leverages your unique asset** - IOPPS interviews are content gold
2. **Positions IOPPS as a media company** - differentiator
3. **Creates ongoing value** - new interviews = new content
4. **Drives YouTube engagement** - integrates with existing API
5. **Medium effort, high impact** - achievable quickly
6. **Scalable** - works with 3 interviews or 300

Then **add Option A: Partner Spotlight** above it for featured/premium partners.

---

## Implementation Phases

### Phase 2A: "Fresh From The Studio" (3-4 days)
1. Create InterviewFeed component
2. Fetch interviews from YouTube API or Firestore
3. Horizontal scroll with video cards
4. Click to play in modal
5. Add to homepage below logo carousel

### Phase 2B: "Partner Spotlight" (2-3 days)
1. Create PartnerSpotlight component
2. Filter partners with IOPPS interviews
3. Auto-rotating carousel with video preview
4. Quote extraction from interview data
5. Add to homepage above pillars

### Phase 3: Enhanced Partner Profiles (future)
- Video wall on dedicated /partners page
- Story cards for deep exploration
- Impact metrics dashboard

---

## Data Requirements

**For interviews, you already have:**
- `Interview.videoUrl` / `videoId` / `videoProvider`
- `Interview.title` / `description`
- `Interview.highlights[]` - perfect for quotes!
- `Interview.viewsCount`
- `Interview.isIOPPSInterview` - filter flag
- `Interview.duration`

**What might help:**
- `Interview.pullQuote` - featured quote
- `Interview.thumbnailUrl` - custom thumbnail
- `EmployerProfile.featuredInterview` - admin-selected showcase interview

---

## Questions Before Implementation

1. **How many partners currently have IOPPS interviews?** (determines which option makes sense)
2. **Do you want manual curation or automatic rotation?**
3. **Should this replace or complement the logo carousel?**
4. **Premium feature for TIER2 partners only, or all partners with interviews?**

---

*"The best way to predict the future is to create it."*

Ready to build whichever option resonates with you.

# IOPPS Employer Profile System — Comprehensive QA Test Script

**Target environment:** https://iopps-fresh.vercel.app
**Date prepared:** 2026-02-22

## Test Accounts

| Account | Email | Role | UID |
|---------|-------|------|-----|
| Employer owner | wingchucks@gmail.com | Employer, orgRole: "owner" | 2PAiIDcCYBfe0itB4mKF73fZxeI3 |
| Super admin | nathan.arias@iopps.ca | Admin, role: "admin" | ZDOiBitFKDbDD286ZGK3YsWRxfv1 |

## Conventions

- **EXPECTED:** describes what should happen after the action
- **VERIFY:** describes a visual/behavioral assertion
- **[DESTRUCTIVE]** marks steps that create or modify real data
- **[EDGE CASE]** marks negative/boundary tests
- `{timestamp}` = substitute current date/time for unique test data

---

## Section 1: For Employers Landing Page

### 1.1 Page load and content
1. Open `/for-employers` in an incognito window (not logged in).
2. EXPECTED: Page loads with gradient hero, "Partner with IOPPS" heading.
3. VERIFY: Subtitle reads "Reach 84,000+ Indigenous professionals, students, and community members."
4. VERIFY: "Sign In" and "Join Free" links in the top-right of the hero.
5. VERIFY: Two CTA buttons: "Get Started" → `/org/signup`, "View Partners" → `/partners`.

### 1.2 Value propositions
6. Scroll to the "Why Partner with IOPPS?" section.
7. VERIFY: Four cards: "Post Jobs & Events", "Build Brand Visibility", "Access Talent Pool", "Analytics Dashboard" — each with icon and description.

### 1.3 Pricing tiers
8. Scroll to the "Choose Your Plan" section.
9. VERIFY: Standard plan — "$1,250 /yr" with: Up to 10 active job postings, Basic organization profile, Event listings, Community feed access, Email support. CTA: "Get Started" → `/org/signup`.
10. VERIFY: Premium plan — "$2,500 /yr" with "RECOMMENDED" badge. Features: Unlimited job postings, Premium profile with featured badge, Priority event placement, Analytics dashboard, Dedicated account manager, Custom branding options, Scholarship program listing, Live stream hosting. CTA: "Get Premium" → `/org/signup`.

### 1.4 Bottom CTA & navigation
11. Scroll to "Ready to Connect?" section. VERIFY: "Get Started Today" button → `/org/signup`.
12. Click "Sign In" in hero. EXPECTED: Navigates to `/login`.
13. Press Back, click "Join Free". EXPECTED: Navigates to `/signup`.

---

## Section 2: Organization Signup

### 2.1 Page structure
14. Navigate to `/org/signup` in incognito.
15. VERIFY: Form heading "Organization Registration" with fields (in order): Organization Name, Organization Type dropdown, Contact Name, Email, Password, Confirm Password, Terms checkbox.
16. VERIFY: Org Type dropdown options: Business, School / Educational Institution, Non-Profit Organization, Government Agency.
17. VERIFY: Submit button reads "Register Organization".
18. VERIFY: "Already have an account? Sign in" link → `/login` and "Back to home" link → `/`.

### 2.2 Validation — empty fields
19. [EDGE CASE] Click "Register Organization" without filling any fields.
20. EXPECTED: Browser native `required` validation fires. Form NOT submitted.

### 2.3 Validation — terms not accepted
21. Fill all fields with valid data, leave terms checkbox unchecked.
22. Click "Register Organization".
23. EXPECTED: Error: "You must accept the Terms of Service to continue."

### 2.4 Validation — password mismatch
24. Check terms, set Confirm Password to something different from Password.
25. Click "Register Organization".
26. EXPECTED: Error: "Passwords don't match."

### 2.5 Validation — password too short
27. Set both Password and Confirm Password to `12345` (5 chars).
28. Click "Register Organization".
29. EXPECTED: Error: "Password must be at least 6 characters."

### 2.6 Validation — duplicate email
30. [EDGE CASE] Use email `wingchucks@gmail.com` (existing account).
31. Click "Register Organization".
32. EXPECTED: Error: "An account with this email already exists."

### 2.7 Terms/Privacy links
33. Click "Terms of Service" link. EXPECTED: Navigates to `/terms`.
34. Go back, click "Privacy Policy". EXPECTED: Navigates to `/terms`.

### 2.8 Redirect for authenticated users
35. Log in as `wingchucks@gmail.com`, then navigate to `/org/signup`.
36. EXPECTED: Redirects to `/org/onboarding`.

### 2.9 Successful signup [DESTRUCTIVE]
37. With a disposable email, fill all fields validly and submit.
38. EXPECTED: Button text → "Creating account...", then redirects to `/verify-email`.
39. VERIFY: Firebase Auth user created. Document in `organizations` collection created with `name`, `type`, `contactName`, `contactEmail`.

---

## Section 3: Email Verification

40. After signup, VERIFY: `/verify-email` page shows instructions to check email.
41. Open verification email and click the link.
42. EXPECTED: Email marked verified in Firebase Auth. User can proceed.

---

## Section 4: Organization Onboarding (4-Step Wizard)

**Prerequisite:** Log in with an org account that has NOT completed onboarding.

### 4.1 Wizard structure
43. Navigate to `/org/onboarding`.
44. EXPECTED: "Set Up Your Organization" heading, "Step 1 of 4 — Identity".
45. VERIFY: Progress bar at 25% (teal). Four step indicators. Only "Next" button (no "Back" on step 1).

### 4.2 Redirect behavior
46. If user has no org doc → EXPECTED: Redirects to `/org/signup`.
47. If `onboardingComplete: true` → EXPECTED: Redirects to `/org/plans`.

### 4.3 Step 1: Identity
48. VERIFY: Fields: Logo upload area, Description textarea, Founded Year number input, Community Affiliation text input.
49. Click upload area. EXPECTED: File picker with `image/png,image/jpeg` filter.
50. Select valid PNG/JPG. EXPECTED: Preview appears in 80×80 box.
51. Fill: Description `QA Test org`, Founded Year `2015`, Community `Cree Nation`.
52. [EDGE CASE] Try Founded Year `1799` (below min 1800). VERIFY: HTML5 `min` validation.
53. Click "Next". EXPECTED: "Saving..." then Step 2. Progress bar → 50%.

### 4.4 Step 2: Details
54. VERIFY: Fields: Industry dropdown, Organization Size button group, City, Province dropdown, Website.
55. VERIFY: Industry options include: Technology, Healthcare, Education, Finance, Manufacturing, Construction, Retail, Hospitality, Agriculture, Transportation, Government, Non-Profit, Other.
56. VERIFY: Size buttons: 1-10, 11-50, 51-200, 201-500, 500+.
57. VERIFY: Province dropdown has all 13 Canadian provinces/territories.
58. Select Industry: Technology, Size: 11-50, City: Saskatoon, Province: Saskatchewan, Website: `https://qatest.example.com`.
59. Click "Next". EXPECTED: Step 3. Progress bar → 75%.

### 4.5 Step 3: Capabilities
60. VERIFY: Services checkboxes (Recruitment, Training, Mentorship, Scholarships, Events, Community Programs), Hiring Status (Actively Hiring, Open to Applications, Not Hiring), Partnership Interests (Co-op Placements, Job Fairs, Mentorship Programs, Sponsorships, Training Partnerships, Community Events).
61. Click "Recruitment" and "Training". VERIFY: Both turn teal with checkmark.
62. Click "Recruitment" again. EXPECTED: Deselects.
63. Click "Actively Hiring". Click "Co-op Placements" and "Job Fairs".
64. Click "Next". EXPECTED: Step 4. Progress bar → 100%.

### 4.6 Back button
65. On Step 4, click "Back". EXPECTED: Returns to Step 3 with previous selections preserved.
66. Click "Next" to return to Step 4.

### 4.7 Step 4: Contact
67. VERIFY: Fields: Phone Number, Address, Social Media (Facebook, LinkedIn, Instagram, Twitter / X).
68. Fill: Phone `(306) 555-1234`, Address `123 Main Street, Saskatoon, SK`, Facebook `https://facebook.com/qatest`, LinkedIn `https://linkedin.com/company/qatest`.
69. Click "Complete Setup". EXPECTED: "Saving..." then redirects to `/org/plans`.
70. VERIFY: Firestore org doc has `onboardingComplete: true` and all step 1-4 data.

### 4.8 [EDGE CASE] Skip all fields
71. With a fresh org, click "Next" through all steps without filling anything.
72. EXPECTED: No validation blocks progression. "Complete Setup" sets `onboardingComplete: true`.

---

## Section 5: Plans & Pricing

73. After onboarding, VERIFY: `/org/plans` shows "Plans & Pricing" heading.
74. VERIFY: "Back to Dashboard" link → `/org/dashboard`.
75. VERIFY: Plan tier cards render. Current plan indicated if subscription exists.

---

## Section 6: Checkout Flow

### 6.1 Standard checkout
76. Navigate to `/org/checkout?plan=tier1`.
77. VERIFY: Standard: $1,250.00, GST (5%): $62.50, Total: $1,312.50, "Billed annual".
78. VERIFY: "Proceed to Payment" button, "Back to Plans" link, Stripe redirect notice.

### 6.2 Premium checkout
79. Navigate to `/org/checkout?plan=tier2`.
80. VERIFY: Premium: $2,500.00, GST: $125.00, Total: $2,625.00.

### 6.3 School checkout
81. Navigate to `/org/checkout?plan=tier3`.
82. VERIFY: School: $5,500.00, GST: $275.00, Total: $5,775.00.

### 6.4 One-time post checkouts
83. `/org/checkout?plan=standard-post` → $125.00, GST: $6.25, Total: $131.25, "One-time payment".
84. `/org/checkout?plan=featured-post` → $200.00, GST: $10.00, Total: $210.00.
85. `/org/checkout?plan=program-post` → $50.00, GST: $2.50, Total: $52.50.

### 6.5 Invalid plan
86. [EDGE CASE] `/org/checkout?plan=nonexistent`. EXPECTED: Falls back to tier1 display.

### 6.6 Payment button
87. Click "Proceed to Payment". EXPECTED: Button → "Redirecting to payment...", becomes disabled. Calls `/api/stripe/checkout`.

### 6.7 Success page
88. Navigate to `/org/checkout/success?session_id=cs_test_123456789abcdef`.
89. VERIFY: Green checkmark, "Payment Successful!" heading, reference number, "Go to Dashboard" button, "View Plans" link.

### 6.8 Cancel page
90. Navigate to `/org/checkout/cancel?plan=tier1`.
91. VERIFY: Amber X icon, "Payment Cancelled" heading, "Try Again" button → `/org/checkout?plan=tier1`, "Back to Plans" link.

---

## Section 7: Employer Dashboard

**Prerequisite:** Log in as `wingchucks@gmail.com`.

### 7.1 Access and layout
92. Navigate to `/org/dashboard`.
93. VERIFY: "[OrgName] Dashboard" heading with org avatar, subtitle "Manage your job postings and applications".
94. VERIFY: Action buttons: "Talent Search", "Edit Profile", "Analytics", "View Applications", "+ Post a Job" (teal).

### 7.2 Stats cards
95. VERIFY: Three cards: "Total Posts", "Active Posts", "Applications" — numbers accurate.

### 7.3 Job listing table
96. VERIFY: Each job card shows: title, status badge (active=green, draft=yellow, closed=gray), location, posted date, app count, closing date.
97. VERIFY: Action buttons per card: Close/Reopen toggle, Quick Edit, Full Edit, Delete.
98. If no jobs: VERIFY empty state "No job postings yet."

### 7.4 URL-triggered form
99. Navigate to `/org/dashboard?create=job`. EXPECTED: Job creation form auto-opens.

### 7.5 Access control
100. Log out → `/org/dashboard`. EXPECTED: Redirects to `/login`.
101. Log in as non-employer → `/org/dashboard`. EXPECTED: Redirects to `/feed`.

---

## Section 8: Job Creation (Inline Form)

### 8.1 Open form
102. Click "+ Post a Job". EXPECTED: Inline card with "Create Job Posting" heading.

### 8.2 Form fields
103. VERIFY: Title*, Slug (auto-generated), Location, Salary, Closing Date, Description, Responsibilities list, Qualifications list, Benefits list. Buttons: "Publish", "Save as Draft", "Cancel".

### 8.3 Auto-slug
104. Type Title: `QA Test Job {timestamp}`. VERIFY: Slug auto-populates.

### 8.4 List editor
105. Click "+ Add Responsibility". EXPECTED: New input row.
106. Type `Manage daily operations`. Add another: `Report to senior management`.
107. Click "Remove" on first item. EXPECTED: Only second item remains.

### 8.5 Publish job [DESTRUCTIVE]
108. Fill: Title `QA Test Senior Developer {timestamp}`, Location `Toronto, ON`, Salary `$80,000 - $100,000`, Closing Date (30 days out), Description, Responsibilities (2), Qualifications (2), Benefits (2).
109. Click "Publish". EXPECTED: "Saving..." → form closes → new job in list with "active" badge.

### 8.6 Save as draft [DESTRUCTIVE]
110. Create another job, click "Save as Draft". EXPECTED: Job appears with "draft" badge.

### 8.7 [EDGE CASE] Empty title
111. Open form, leave title empty, click "Publish". EXPECTED: Nothing happens (prevented by code).

### 8.8 Cancel
112. Open form, type something, click "Cancel". EXPECTED: Form closes, no job created.

---

## Section 9: Job Editing

### 9.1 Quick Edit
113. Click "Quick Edit" on a job. EXPECTED: Inline form opens with existing data. Slug field disabled.
114. Append " (Edited)" to title. Click "Publish". EXPECTED: Title updates in list.

### 9.2 Full Edit page
115. Click "Full Edit". EXPECTED: Navigates to `/org/dashboard/jobs/[id]/edit`.
116. VERIFY: "Back to Dashboard" link, "Edit Job Posting" heading.
117. VERIFY: Fields: Title*, Description, City, Province, Employment Type dropdown (Full-time, Part-time, Contract, Temporary, Internship), Salary Min, Salary Max, Requirements chip input, Skills chip input, Closing Date, Application URL, Status radios (draft, active, closed).

### 9.3 Requirements management
118. Type requirement, press Enter. EXPECTED: Added to list with X button.
119. Click X. EXPECTED: Removed.

### 9.4 Skills management
120. Type "JavaScript", click "Add". EXPECTED: Teal chip with X.
121. [EDGE CASE] Try adding "JavaScript" again. EXPECTED: Duplicate NOT added.

### 9.5 Status changes
122. Select "draft" radio → "Save Changes". EXPECTED: Toast "Job updated successfully".
123. Click "Unpublish" on active job. EXPECTED: Toast "Job unpublished", status → draft, button disappears.
124. Click "Close Position". EXPECTED: Toast "Position closed", status → closed, closing date → today.

### 9.6 Delete [DESTRUCTIVE]
125. Click "Delete" (red). EXPECTED: Modal: 'Delete Job Posting?' with job title.
126. Click "Cancel". EXPECTED: Modal closes.
127. Click "Delete" again → "Yes, Delete". EXPECTED: Toast "Job deleted", redirects to dashboard.

### 9.7 [EDGE CASE] Empty title save
128. Clear title, click "Save Changes". EXPECTED: Toast "Title is required".

---

## Section 10: Toggle Job Status from Dashboard

129. Find active job → click "Close". EXPECTED: Badge → closed, button → "Reopen".
130. Click "Reopen". EXPECTED: Badge → active, button → "Close".

---

## Section 11: Delete Job from Dashboard [DESTRUCTIVE]

131. Click "Delete" on test job. EXPECTED: Browser `confirm()` dialog.
132. Click "Cancel". EXPECTED: Job remains.
133. Click "Delete" again → "OK". EXPECTED: Job removed from list.

---

## Section 12: Profile Settings

### 12.1 Navigation
134. Click "Edit Profile" from dashboard. EXPECTED: `/org/dashboard/profile`.

### 12.2 Completeness indicator
135. VERIFY: "Profile Completeness" card with percentage + progress bar.
136. Formula: counts name, logo, description, industry, size, city/province, website, phone (8 fields).

### 12.3 Form sections
137. VERIFY: Four cards: Identity (Logo, Name, Description), Details (Industry, Size, City, Province, Website), Contact (Phone, Email, Address), Social Links (Facebook, LinkedIn, Instagram, Twitter/X).

### 12.4 Logo upload
138. Click "Upload Logo". Select valid image. EXPECTED: "Uploading..." → "Logo uploaded" toast → preview.

### 12.5 Industry & size
139. VERIFY: Industry dropdown includes: Technology, Healthcare, Education, Finance, Manufacturing, Retail, Construction, Transportation, Agriculture, Energy, Media & Entertainment, Hospitality, Real Estate, Non-Profit, Government, Other.
140. VERIFY: Size buttons: 1-10, 11-50, 51-200, 200+.

### 12.6 Preview mode
141. Click "Preview". EXPECTED: Read-only preview card. Click "Edit Mode" to return.

### 12.7 Save profile [DESTRUCTIVE]
142. Make a change, click "Save Changes". EXPECTED: Toast "Profile saved successfully". Persists on reload.

### 12.8 Completeness recalculation
143. Fill all 8 fields → VERIFY: 100%. Remove phone → VERIFY: Drops to ~88%.

---

## Section 13: Applications Management

144. Click "View Applications" from dashboard. EXPECTED: `/org/dashboard/applications`.
145. VERIFY: Heading with total count (e.g., "3 total applications across 2 postings").
146. If empty: VERIFY: "No applications received yet" message.
147. If populated: VERIFY: Grouped by job title, each card shows applicant ID, status badge, date, "View Profile" link.

### Status change [DESTRUCTIVE]
148. Change status via dropdown. EXPECTED: Badge updates with correct color (Submitted=blue, Reviewing=amber, Shortlisted=teal, Interview=purple, Offered=green, Rejected=red, Withdrawn=gray).

### View Profile
149. Click "View Profile". EXPECTED: Navigates to `/members/[userId]`.

---

## Section 14: Analytics Page

150. Click "Analytics" from dashboard. EXPECTED: `/org/dashboard/analytics`.
151. VERIFY: Four stat cards: Active Jobs, Total Applications, Profile Views (--), Avg Response Time (--).
152. VERIFY: Job Performance table: Title, Status badge, Applications count, Posted date.
153. VERIFY: Recent Activity section (max 20 entries). Each shows "Application for [Job Title]", date, status.

---

## Section 15: Talent Search

154. Click "Talent Search" from dashboard. EXPECTED: `/org/dashboard/talent`.

### Filters
155. VERIFY: Search input, Skills chip input, Location input, Work Preference dropdown (All, Remote, In-Person, Hybrid), "Open to Work only" toggle.
156. Search a name → results filter live. Clear → all members shown.
157. Add skill chip "JavaScript" → results filter. Add "Python" → OR logic. Remove chip → updates.
158. Type location "Toronto" → filters by location.
159. Select "Remote" → only remote preference members.
160. Toggle "Open to Work" on → only `openToWork: true` members (green badge). Toggle off.

### Results
161. [EDGE CASE] Restrictive filters → "No members found" empty state.
162. VERIFY: Member cards show avatar, name, bio, skills (max 5 + overflow), location, "View Profile" → `/members/[uid]`, "Message" → `/messages?to=[uid]`.
163. VERIFY: "N member(s) found" count updates with filters.

---

## Section 16: Public Organization Profile

164. Navigate to `/org/[slug]` for a known org.
165. VERIFY: Hero with logo/avatar, name, location, website, type/industry/size badges.
166. VERIFY: Follow button toggles "+ Follow" ↔ "Following".
167. VERIFY: Stats: Open Jobs, Company Size, Since, Verified.
168. VERIFY: About section with description, tags, services.

### Authenticated vs unauthenticated
169. Logged in: VERIFY Contact & Info card (location, website, phone, email, address), Social links, Open Positions, Upcoming Events.
170. Logged out: VERIFY basic info visible but "Sign in to see more" card shown instead of jobs/events.

### Edge cases
171. Navigate to `/org/nonexistent-slug-12345`. EXPECTED: "Organization Not Found" page with "Browse Partners" button.

---

## Section 17: Organizations Directory

172. Navigate to `/organizations`.
173. VERIFY: Hero with "Organizations" heading, search bar, type filter chips (All, Employer, School, Non-Profit, Government, Business).
174. Search known org name → results filter. Clear (X button) → reset.
175. Click "School" filter → only schools shown (highlighted navy). Click "All" → reset.
176. VERIFY: "N organization(s) found" count. Cards show avatar, name, type badge, location, description (2-line clamp), tags, open jobs count.
177. Click card → navigates to `/org/[orgId]`.
178. [EDGE CASE] Search impossible term → "No organizations found" empty state.
179. Combined filters: type + search → AND logic applies.

---

## Section 18: Jobs Browse Page

180. Navigate to `/jobs`.
181. VERIFY: Hero, search bar, filters (Location, Employment Type dropdown, Salary Min/Max, Remote toggle).
182. Search job title → results filter. Location "Saskatoon" → filters. Employment type "Full-time" → filters.
183. Salary Min 50000, Max 80000 → overlapping ranges shown. Remote toggle → "remote" jobs.
184. VERIFY: 2-column grid, cards show employer avatar, title, org name, location, type badge, salary, posted time, "Apply" link.
185. VERIFY: Featured jobs have gold left border + "Featured" badge. Jobs closing within 7 days show "Closing Soon".
186. Click card → `/jobs/[slug]`.
187. [EDGE CASE] Impossible filters → "No jobs found" empty state with feed link.

---

## Section 19: Job Detail Page

**Prerequisite:** Logged in.

188. Navigate to `/jobs/[slug]`. VERIFY: "Back to Jobs" link, badges (Featured, Employment Type, Indigenous Preference), title, employer info, location, salary, closing date.
189. VERIFY: Description ("About This Role"), Requirements, Responsibilities (checkmark list), Qualifications (bullet list).
190. VERIFY: Sticky sidebar: Apply button, Save button, Job Details section.

### Apply button behavior
191. External `applicationUrl` → opens in new tab. No URL → navigates to `/jobs/[slug]/apply`. Already applied → green "Applied" (disabled).

### Save/Unsave
192. Click "Save Job" → "Saved". Click again → "Save Job".

### Not found
193. `/jobs/nonexistent-slug-xyz` → "Job Not Found" page.

---

## Section 20: Job Application Wizard

**Prerequisite:** Logged in, job without external application URL.

### Step 1: Resume
194. Navigate to `/jobs/[slug]/apply`. VERIFY: "Apply to [Job Title]", 3-step indicator, Step 1 active.
195. [EDGE CASE] Already applied → toast + redirect to job detail.
196. VERIFY: Drag-and-drop upload area, "Use my IOPPS Profile" toggle.
197. Upload valid PDF < 5MB → "Uploading..." → "Resume uploaded" → file details + "Remove" button.
198. [EDGE CASE] Upload .txt/.png → "Please upload a PDF or DOC file".
199. [EDGE CASE] Upload > 5MB → "File must be under 5MB".
200. Click "Remove" → file removed, upload area returns.
201. Toggle "Use my IOPPS Profile" → clears file, shows profile message. Toggle off.
202. Click "Next" → Step 2.

### Step 2: Cover Letter
203. VERIFY: "Cover Letter" heading, "Optional but recommended", 3 template prompt buttons.
204. Click prompt → text appended to textarea. Click second prompt → appended with newline.
205. VERIFY: Character count. < 50 chars → "(50+ recommended)" warning.
206. Click "Next" → Step 3.

### Step 3: Review & Submit
207. VERIFY: "Review Your Application" with Position, Resume, Cover Letter sections.
208. Each section has "Edit" link → returns to that step (data preserved).
209. Click "Submit Application" [DESTRUCTIVE]. EXPECTED: "Submitting..." → "Application submitted!" → redirect to `/feed`.
210. VERIFY: `applications` doc created with userId, postId, status: "submitted", statusHistory, resumeUrl, coverLetter.

### Back button
211. On Step 2, click "Back" → Step 1 with data preserved.

---

## Section 21: Admin Employers Management

**Prerequisite:** Log in as `nathan.arias@iopps.ca`.

212. Navigate to `/admin/employers`. VERIFY: "Employer Management" heading, tabs (All, Pending, Approved, Rejected).
213. Click "Pending" → only pending employers shown. Click "All" → reset.
214. Search by employer name → client-side filter.
215. VERIFY: Table shows org name, contact, status badge (pending=amber, approved=green, rejected=red), date, actions.

### Approve [DESTRUCTIVE]
216. Click "Approve" on pending employer. EXPECTED: Toast "Employer approved successfully", status → approved. Firestore: `status: "approved"`, `approvedAt`.

### Reject [DESTRUCTIVE]
217. Click "Reject". EXPECTED: Modal with textarea for reason.
218. [EDGE CASE] Click "Reject Employer" without reason → button disabled.
219. Enter reason → "Reject Employer". EXPECTED: Toast "Employer rejected", status → rejected. Firestore: `rejectionReason`.

### Modal dismiss
220. Open reject modal → press Escape or click backdrop → modal closes.

### Re-approve rejected
221. Find rejected employer → "Approve". EXPECTED: Status → approved.

### Pagination
222. If >20 employers: VERIFY "Showing 1-20 of N", Next/Previous buttons. Previous disabled on page 1.

### Mobile
223. Resize to mobile → VERIFY: Card layout replaces table.

---

## Section 22: Admin Employer Detail

224. Click employer name → `/admin/employers/[orgId]`.
225. VERIFY: Employer profile data, team members, stats (jobs, applications, views), action history.

### Toggle verified [DESTRUCTIVE]
226. Toggle "Verify". EXPECTED: PATCH request, `verified: true/false`.

### Enable/Disable [DESTRUCTIVE]
227. Toggle disable. EXPECTED: `disabled: true/false`.

### Action history
228. VERIFY: Each PATCH creates entry in `actionHistory` subcollection.

---

## Section 23: Admin Jobs Management

229. Navigate to `/admin/jobs`. VERIFY: "Jobs Management" heading, 3 stat cards (Total, Active, Inactive).
230. VERIFY: Tabs (All, Active, Inactive). Click "Active" → only active jobs.
231. Search by title/employer → client-side filter.
232. VERIFY: Table columns: Title + employer, Location, Status badge, Applications, Posted, Actions.

### Toggle status [DESTRUCTIVE]
233. Deactivate active job (pause icon) → inactive. Reactivate (play icon) → active.

### Delete [DESTRUCTIVE]
234. Click trash → confirmation dialog. Cancel → job stays. Confirm → job removed.

### Pagination
235. If >20 jobs: VERIFY pagination with "Showing X-Y of Z".

---

## Section 24: API Route Verification

### Employer Check API
236. `GET /api/employer/check` without auth → 401.
237. With wingchucks token → 200, `{ authorized: true, profile: { orgId, orgRole: "owner" } }`.
238. With non-employer token → 403.

### Employer Dashboard API
239. `GET /api/employer/dashboard` with employer token → 200, `{ org, jobs, posts, profile }`.
240. With non-employer token → 403.

### Jobs API
241. `GET /api/jobs` → 200, `{ jobs: [...] }` (all active).
242. `GET /api/jobs/[id]` → 200, `{ job: {...} }`.
243. `GET /api/jobs/nonexistent` → 404.

### Admin Employers API
244. `GET /api/admin/employers` with admin token → 200.
245. `GET /api/admin/employers?status=pending` → only pending.
246. `GET /api/admin/employers?status=invalid` → 400.
247. `POST /api/admin/employers` with `{ employerId, action: "approve" }` → 200.
248. POST without `employerId` → 400. Invalid action → 400. Nonexistent ID → 404.

### Admin Jobs API
249. `GET /api/admin/jobs` with admin token → 200, `{ jobs, total }`.

---

## Section 25: Auth & Access Control

250. Logged out → `/org/dashboard` → redirects to `/login`.
251. Non-employer logged in → `/org/dashboard` → redirects to `/feed`.
252. Employer logged in → `/org/dashboard` → loads successfully.
253. Logged out → `/jobs/[slug]` → redirects to `/login`.
254. Logged out → `/jobs/[slug]/apply` → redirects to `/login`.
255. Logged out → `/org/plans` → redirects to `/login`.
256. Logged out → `/org/checkout?plan=tier1` → redirects to `/login`.

---

## Section 26: Responsive Design

257. `/org/dashboard` at 375px → buttons wrap, stats stack, cards stack.
258. Job creation form on mobile → fields stack single-column.
259. Full edit page on mobile → city/province and salary fields stack.
260. Talent search on mobile → filters stack, cards single-column.
261. `/organizations` on mobile → filter chips scroll, cards stack.
262. `/jobs` on mobile → filters stack, cards single-column.
263. Job detail on mobile → single-column (main above sidebar).

---

## Section 27: Cross-Cutting Concerns

### Loading states
264. VERIFY loading skeleton/spinner on: `/org/dashboard`, `/org/dashboard/profile`, `/org/dashboard/applications`, `/org/dashboard/analytics`, `/org/dashboard/talent`, `/org/dashboard/jobs/[id]/edit`, `/org/[slug]`, `/organizations`, `/jobs`, `/jobs/[slug]`, `/jobs/[slug]/apply`.

### Toast notifications
265. VERIFY success toasts: "Logo uploaded", "Profile saved successfully", "Job updated successfully", "Job unpublished", "Position closed", "Job deleted", "Resume uploaded", "Application submitted!", "Employer approved successfully", "Employer rejected".
266. VERIFY error toasts: "Failed to upload logo", "Failed to save profile", "Title is required", "Please upload a PDF or DOC file", "File must be under 5MB", "Failed to submit application".

### Browser navigation
267. Dashboard → Profile → Back → Dashboard works.
268. Dashboard → Full Edit → Save → Back → Dashboard works.

### Page refresh persistence
269. Profile edit: save changes → refresh → saved values reloaded.
270. Onboarding: complete step 1 → advance → refresh → step 1 data reloaded.

---

## Cleanup Checklist

After all tests:
- [ ] Delete test organizations from `organizations` collection
- [ ] Delete test jobs created via dashboard
- [ ] Delete test Firebase Auth users
- [ ] Revert employer status changes (approve/reject)
- [ ] Revert job status changes (active/inactive)
- [ ] Remove test applications from `applications` collection

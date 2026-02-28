/**
 * Centralized selectors for IOPPS Playwright tests.
 * The app has no data-testid attributes, so we rely on text, placeholder, and structure.
 */

// ── Login page ──────────────────────────────────────────────
export const login = {
  emailInput: 'input[placeholder="you@example.com"]',
  passwordInput: 'input[placeholder="Enter your password"]',
  signInButton: 'button:has-text("Sign In")',
  googleButton: 'button:has-text("Continue with Google")',
  forgotPasswordLink: 'a:has-text("Forgot password")',
  signUpLink: 'a:has-text("Sign up")',
};

// ── Org signup ──────────────────────────────────────────────
export const orgSignup = {
  orgNameInput: 'input[placeholder="Your organization\'s name"]',
  orgTypeSelect: 'select',
  contactNameInput: 'input[placeholder="Primary contact person"]',
  emailInput: 'input[placeholder="org@example.com"]',
  passwordInput: 'input[placeholder="At least 6 characters"]',
  confirmPasswordInput: 'input[placeholder="Re-enter your password"]',
  termsCheckbox: 'input[type="checkbox"]',
  submitButton: 'button:has-text("Register Organization")',
};

// ── For-employers landing ───────────────────────────────────
export const forEmployers = {
  heroHeading: 'text=Partner with IOPPS',
  getStartedCTA: 'a:has-text("Get Started")',
  viewPartnersCTA: 'a:has-text("View Partners")',
  signInLink: 'a:has-text("Sign In")',
  joinFreeLink: 'a:has-text("Join Free")',
};

// ── Org dashboard ───────────────────────────────────────────
export const dashboard = {
  postJobButton: 'button:has-text("Post a Job")',
  talentSearchButton: ':has-text("Talent Search")',
  editProfileButton: ':has-text("Edit Profile")',
  analyticsButton: ':has-text("Analytics")',
  applicationsButton: ':has-text("View Applications")',
};

// ── Plans page ──────────────────────────────────────────────
export const plans = {
  backToDashboard: 'a:has-text("Back to Dashboard")',
};

// ── Checkout ────────────────────────────────────────────────
export const checkout = {
  proceedButton: 'button:has-text("Proceed to Payment")',
  successHeading: 'text=Payment Successful',
  cancelHeading: 'text=Payment Cancelled',
  goToDashboard: 'a:has-text("Go to Dashboard")',
};

// ── Profile settings ────────────────────────────────────────
export const profile = {
  heading: 'text=Edit Organization Profile',
  previewToggle: 'button:has-text("Preview")',
  editModeToggle: 'button:has-text("Edit Mode")',
};

// ── Applications ────────────────────────────────────────────
export const applications = {
  heading: 'text=Applications',
};

// ── Analytics ───────────────────────────────────────────────
export const analytics = {
  heading: 'text=Analytics',
};

// ── Talent search ───────────────────────────────────────────
export const talent = {
  heading: 'text=Talent Search',
  searchInput: 'input[placeholder*="Search by name"]',
  openToWorkToggle: 'text=Open to Work',
};

// ── Organizations directory ─────────────────────────────────
export const orgsDirectory = {
  searchInput: 'input[placeholder*="Search organizations"]',
};

// ── Jobs browse ─────────────────────────────────────────────
export const jobsBrowse = {
  searchInput: 'input[placeholder*="Search job"]',
  locationInput: 'input[placeholder*="City or province"]',
  typeSelect: 'select',
  remoteButton: 'button:has-text("Remote")',
};

// ── Job detail ──────────────────────────────────────────────
export const jobDetail = {
  backLink: 'a:has-text("Back to Jobs")',
  applyButton: ':has-text("Apply Now")',
};

// ── Admin employers ─────────────────────────────────────────
export const adminEmployers = {
  searchInput: 'input[placeholder*="Search employers"]',
};

// ── Admin jobs ──────────────────────────────────────────────
export const adminJobs = {
  searchInput: 'input[placeholder*="Search"]',
};

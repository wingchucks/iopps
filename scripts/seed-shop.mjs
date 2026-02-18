/**
 * Seed shop vendors & listings into Firestore via REST API.
 * Usage: node scripts/seed-shop.mjs
 */

import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ── Auth ─────────────────────────────────────────────────────────────
const configPath = join(homedir(), ".config", "configstore", "firebase-tools.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const refreshToken = config.tokens?.refresh_token;
if (!refreshToken) { console.error("No refresh token. Run: npx firebase login"); process.exit(1); }

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
  }),
});
const { access_token } = await tokenRes.json();
if (!access_token) { console.error("Failed to get access token."); process.exit(1); }
console.log("Authenticated.");

// ── REST helpers ─────────────────────────────────────────────────────
const PROJECT = "iopps-c2224";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    if (val.__type === "serverTimestamp") return { timestampValue: new Date().toISOString() };
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

async function setDoc(collection, docId, data) {
  const res = await fetch(`${BASE}/${collection}/${docId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`Failed ${collection}/${docId}: ${res.status} ${await res.text()}`);
}

const ts = { __type: "serverTimestamp" };

// ── Shop Vendors ─────────────────────────────────────────────────────
const vendors = [
  {
    id: "beadwork-by-dawn",
    name: "Beadwork by Dawn",
    slug: "beadwork-by-dawn",
    category: "Arts & Crafts",
    description: "Handcrafted beadwork jewelry and accessories inspired by Plains Cree traditions. Each piece is made with love and carries cultural significance.",
    logo: "",
    bannerImage: "",
    location: { city: "Saskatoon", province: "SK" },
    website: "",
    phone: "",
    email: "dawn@beadworkbydawn.ca",
    socialLinks: { facebook: "", linkedin: "", instagram: "" },
    featured: true,
    createdAt: ts,
  },
  {
    id: "buffalo-spirit-apparel",
    name: "Buffalo Spirit Apparel",
    slug: "buffalo-spirit-apparel",
    category: "Clothing",
    description: "Indigenous-designed streetwear celebrating culture and identity. T-shirts, hoodies, and caps featuring original artwork by Indigenous artists.",
    logo: "",
    bannerImage: "",
    location: { city: "Regina", province: "SK" },
    website: "",
    phone: "",
    email: "info@buffalospirit.ca",
    socialLinks: { facebook: "", linkedin: "", instagram: "" },
    featured: true,
    createdAt: ts,
  },
  {
    id: "cedar-sage-wellness",
    name: "Cedar & Sage Wellness",
    slug: "cedar-sage-wellness",
    category: "Health & Wellness",
    description: "Traditional plant-based wellness products including sage bundles, cedar teas, and herbal remedies rooted in Indigenous knowledge.",
    logo: "",
    bannerImage: "",
    location: { city: "Prince Albert", province: "SK" },
    website: "",
    phone: "",
    email: "hello@cedarsage.ca",
    socialLinks: { facebook: "", linkedin: "", instagram: "" },
    featured: false,
    createdAt: ts,
  },
  {
    id: "treaty-tech",
    name: "Treaty Tech Solutions",
    slug: "treaty-tech",
    category: "Technology",
    description: "Indigenous-owned IT consulting and web development firm specializing in websites, apps, and digital solutions for First Nations communities and organizations.",
    logo: "",
    bannerImage: "",
    location: { city: "Saskatoon", province: "SK" },
    website: "",
    phone: "",
    email: "info@treatytech.ca",
    socialLinks: { facebook: "", linkedin: "", instagram: "" },
    featured: true,
    createdAt: ts,
  },
  {
    id: "sweetgrass-catering",
    name: "Sweetgrass Catering",
    slug: "sweetgrass-catering",
    category: "Food & Catering",
    description: "Indigenous-inspired catering for events, weddings, and corporate gatherings. Featuring bannock, bison, wild rice, and seasonal berry dishes.",
    logo: "",
    bannerImage: "",
    location: { city: "Saskatoon", province: "SK" },
    website: "",
    phone: "",
    email: "book@sweetgrasscatering.ca",
    socialLinks: { facebook: "", linkedin: "", instagram: "" },
    featured: false,
    createdAt: ts,
  },
  {
    id: "painted-drum-media",
    name: "Painted Drum Media",
    slug: "painted-drum-media",
    category: "Media & Design",
    description: "Full-service creative agency offering branding, graphic design, photography, and video production with an Indigenous lens.",
    logo: "",
    bannerImage: "",
    location: { city: "Saskatoon", province: "SK" },
    website: "",
    phone: "",
    email: "create@painteddrum.ca",
    socialLinks: { facebook: "", linkedin: "", instagram: "" },
    featured: false,
    createdAt: ts,
  },
];

// ── Shop Listings ────────────────────────────────────────────────────
const listings = [
  {
    id: "listing-beaded-earrings",
    vendorId: "beadwork-by-dawn",
    vendorName: "Beadwork by Dawn",
    vendorSlug: "beadwork-by-dawn",
    title: "Plains Cree Beaded Earrings",
    description: "Hand-beaded earrings featuring traditional floral patterns on smoked moosehide. Approximately 2 inches long.",
    type: "product",
    price: 45,
    image: "",
    category: "Jewelry",
    tags: ["beadwork", "earrings", "handmade", "Cree"],
    featured: true,
    active: true,
    createdAt: ts,
  },
  {
    id: "listing-beaded-medallion",
    vendorId: "beadwork-by-dawn",
    vendorName: "Beadwork by Dawn",
    vendorSlug: "beadwork-by-dawn",
    title: "Beaded Medallion Necklace",
    description: "Traditional medallion necklace with geometric star pattern. Comes on a 24-inch leather cord.",
    type: "product",
    price: 85,
    image: "",
    category: "Jewelry",
    tags: ["beadwork", "necklace", "handmade"],
    featured: false,
    active: true,
    createdAt: ts,
  },
  {
    id: "listing-buffalo-hoodie",
    vendorId: "buffalo-spirit-apparel",
    vendorName: "Buffalo Spirit Apparel",
    vendorSlug: "buffalo-spirit-apparel",
    title: "\"Rez Made\" Hoodie",
    description: "Premium heavyweight hoodie featuring original \"Rez Made\" design. Available in S-3XL. 80% cotton, 20% polyester.",
    type: "product",
    price: 75,
    image: "",
    category: "Apparel",
    tags: ["hoodie", "streetwear", "Indigenous art"],
    featured: true,
    active: true,
    createdAt: ts,
  },
  {
    id: "listing-buffalo-cap",
    vendorId: "buffalo-spirit-apparel",
    vendorName: "Buffalo Spirit Apparel",
    vendorSlug: "buffalo-spirit-apparel",
    title: "Treaty Territory Snapback",
    description: "Embroidered snapback cap with \"Treaty Territory\" design. One size fits most.",
    type: "product",
    price: 35,
    image: "",
    category: "Apparel",
    tags: ["cap", "snapback", "Treaty"],
    featured: false,
    active: true,
    createdAt: ts,
  },
  {
    id: "listing-sage-bundle",
    vendorId: "cedar-sage-wellness",
    vendorName: "Cedar & Sage Wellness",
    vendorSlug: "cedar-sage-wellness",
    title: "White Sage Smudge Bundle",
    description: "Ethically harvested white sage bundle for smudging ceremonies. Approximately 4 inches.",
    type: "product",
    price: 12,
    image: "",
    category: "Wellness",
    tags: ["sage", "smudge", "ceremony", "wellness"],
    featured: false,
    active: true,
    createdAt: ts,
  },
  {
    id: "listing-web-development",
    vendorId: "treaty-tech",
    vendorName: "Treaty Tech Solutions",
    vendorSlug: "treaty-tech",
    title: "Website Design & Development",
    description: "Custom website design and development for Indigenous organizations and businesses. Includes responsive design, hosting setup, and 3 months of support.",
    type: "service",
    price: null,
    image: "",
    category: "Technology",
    tags: ["website", "development", "consulting"],
    featured: true,
    active: true,
    createdAt: ts,
  },
  {
    id: "listing-catering-package",
    vendorId: "sweetgrass-catering",
    vendorName: "Sweetgrass Catering",
    vendorSlug: "sweetgrass-catering",
    title: "Community Feast Package",
    description: "Full catering for 50-200 guests. Includes bison stew, bannock, wild rice, seasonal berries, and tea. Setup and serving staff included.",
    type: "service",
    price: null,
    image: "",
    category: "Catering",
    tags: ["catering", "feast", "community", "Indigenous food"],
    featured: false,
    active: true,
    createdAt: ts,
  },
  {
    id: "listing-branding-package",
    vendorId: "painted-drum-media",
    vendorName: "Painted Drum Media",
    vendorSlug: "painted-drum-media",
    title: "Brand Identity Package",
    description: "Complete branding package including logo design, color palette, typography, brand guidelines, and business card design.",
    type: "service",
    price: null,
    image: "",
    category: "Design",
    tags: ["branding", "logo", "design", "identity"],
    featured: false,
    active: true,
    createdAt: ts,
  },
];

// ── Seed ─────────────────────────────────────────────────────────────
async function seed() {
  console.log("Seeding shop vendors...");
  for (const vendor of vendors) {
    const { id, ...data } = vendor;
    await setDoc("shop_vendors", id, data);
    process.stdout.write(".");
  }
  console.log(` ${vendors.length} vendors`);

  console.log("Seeding shop listings...");
  for (const listing of listings) {
    const { id, ...data } = listing;
    await setDoc("shop_listings", id, data);
    process.stdout.write(".");
  }
  console.log(` ${listings.length} listings`);

  console.log("\nDone! Shop data seeded.");
  console.log(`  ${vendors.length} vendors`);
  console.log(`  ${listings.length} listings (${listings.filter(l => l.type === "product").length} products, ${listings.filter(l => l.type === "service").length} services)`);
}

seed().catch((err) => { console.error("Seed failed:", err.message); process.exit(1); });

/**
 * Seed Script for Shop Indigenous
 *
 * Seeds categories, nations, and sample vendors for the Shop Indigenous marketplace.
 *
 * Usage:
 *   npx tsx scripts/seedShopIndigenous.ts
 *
 * Requirements:
 *   - service-account.json in root directory OR
 *   - FIRESTORE_EMULATOR_HOST set for emulator usage
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if using emulator
const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.USE_EMULATOR === 'true';

let db: admin.firestore.Firestore;

if (useEmulator) {
  console.log('🔧 Using Firebase Emulator...');
  process.env['FIRESTORE_EMULATOR_HOST'] = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  process.env['GCLOUD_PROJECT'] = 'demo-iopps';

  admin.initializeApp({
    projectId: 'demo-iopps',
  });
  db = admin.firestore();
} else {
  console.log('🔧 Using Production Firebase...');
  const serviceAccountPath = path.join(__dirname, '../service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ service-account.json not found!');
    console.error('Please download it from Firebase Console and place it in the root directory.');
    console.error('Or set USE_EMULATOR=true to use the emulator.');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  db = admin.firestore();
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  order: number;
  vendorCount: number;
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

interface Nation {
  id: string;
  name: string;
  slug: string;
  alternateNames: string[];
  region: string;
  country: string;
  vendorCount: number;
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  tagline: string;
  description: string;
  nation: string;
  nationId: string;
  additionalNations: string[];
  website: string;
  email: string;
  phone: string;
  profileImage: string;
  coverImage: string;
  gallery: { url: string; caption: string }[];
  videoUrl: string;
  categories: string[];
  categoryIds: string[];
  materials: string[];
  techniques: string[];
  priceRange: 'budget' | 'mid' | 'premium' | 'luxury';
  acceptsCustomOrders: boolean;
  madeToOrder: boolean;
  location: {
    city: string;
    province: string;
    country: string;
    region: string;
    coordinates?: { lat: number; lng: number };
  };
  socialLinks: {
    instagram?: string;
    facebook?: string;
    pinterest?: string;
    tiktok?: string;
    youtube?: string;
  };
  status: 'draft' | 'active' | 'paused' | 'suspended';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt: admin.firestore.Timestamp | null;
  featured: boolean;
  profileCompleteness: number;
  profileViews: number;
  websiteClicks: number;
  favorites: number;
  followers: number;
  averageRating: number;
  reviewCount: number;
  newVendorBoostExpires: admin.firestore.Timestamp;
  lastActiveAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(): string {
  return db.collection('_temp').doc().id;
}

// ============================================================================
// CATEGORY DATA
// ============================================================================

interface CategoryInput {
  name: string;
  description: string;
  subcategories: { name: string; description: string }[];
}

const categoryData: CategoryInput[] = [
  {
    name: 'Art & Fine Crafts',
    description: 'Original artwork and fine crafts created by Indigenous artists',
    subcategories: [
      { name: 'Paintings', description: 'Original paintings on canvas, paper, and other media' },
      { name: 'Prints', description: 'Limited edition prints and reproductions' },
      { name: 'Sculptures', description: 'Three-dimensional artwork in various media' },
      { name: 'Pottery & Ceramics', description: 'Traditional and contemporary pottery and ceramic works' },
      { name: 'Mixed Media', description: 'Artwork combining multiple materials and techniques' },
    ],
  },
  {
    name: 'Jewelry & Accessories',
    description: 'Handcrafted jewelry and accessories featuring traditional and contemporary designs',
    subcategories: [
      { name: 'Rings', description: 'Handcrafted rings in silver, gold, and other materials' },
      { name: 'Necklaces', description: 'Traditional and contemporary necklaces and pendants' },
      { name: 'Earrings', description: 'Handmade earrings in various styles' },
      { name: 'Bracelets', description: 'Bangles, cuffs, and beaded bracelets' },
      { name: 'Bags & Purses', description: 'Handcrafted bags, purses, and pouches' },
      { name: 'Hair Accessories', description: 'Barrettes, clips, and traditional hair adornments' },
    ],
  },
  {
    name: 'Textiles & Clothing',
    description: 'Traditional and contemporary textiles, weavings, and apparel',
    subcategories: [
      { name: 'Blankets', description: 'Traditional and contemporary blankets and throws' },
      { name: 'Apparel', description: 'Clothing featuring Indigenous designs' },
      { name: 'Rugs & Weavings', description: 'Hand-woven rugs, tapestries, and textile art' },
      { name: 'Quilts', description: 'Traditional and contemporary quilts' },
      { name: 'Textile Accessories', description: 'Scarves, shawls, and other textile accessories' },
    ],
  },
  {
    name: 'Home & Living',
    description: 'Indigenous-made home décor and living products',
    subcategories: [
      { name: 'Décor', description: 'Home decorations and wall art' },
      { name: 'Furniture', description: 'Handcrafted furniture pieces' },
      { name: 'Kitchenware', description: 'Bowls, utensils, and kitchen items' },
      { name: 'Garden', description: 'Garden décor and outdoor items' },
    ],
  },
  {
    name: 'Food & Beverage',
    description: 'Traditional foods, specialty items, and Indigenous-owned food businesses',
    subcategories: [
      { name: 'Traditional Foods', description: 'Traditional Indigenous foods and ingredients' },
      { name: 'Specialty Items', description: 'Gourmet and specialty food products' },
      { name: 'Teas & Beverages', description: 'Traditional teas and beverages' },
      { name: 'Seasonings & Spices', description: 'Indigenous seasonings, spices, and rubs' },
    ],
  },
  {
    name: 'Professional Services',
    description: 'Professional services offered by Indigenous business owners',
    subcategories: [
      { name: 'Consulting', description: 'Business, cultural, and Indigenous consulting services' },
      { name: 'Design & Creative', description: 'Graphic design, web design, and creative services' },
      { name: 'Marketing', description: 'Marketing, branding, and communications services' },
      { name: 'Education & Training', description: 'Educational programs and professional training' },
      { name: 'Legal & Business', description: 'Legal, accounting, and business services' },
    ],
  },
  {
    name: 'Experiences',
    description: 'Cultural experiences, tourism, and events',
    subcategories: [
      { name: 'Cultural Tourism', description: 'Cultural tours, heritage experiences, and land-based activities' },
      { name: 'Workshops & Classes', description: 'Art classes, craft workshops, and skill-building programs' },
      { name: 'Events', description: 'Cultural events, gatherings, and celebrations' },
      { name: 'Speaking & Presentations', description: 'Keynote speakers, presentations, and educational talks' },
    ],
  },
];

// ============================================================================
// NATION DATA
// ============================================================================

interface NationInput {
  name: string;
  alternateNames: string[];
  region: string;
  country: string;
}

const nationData: NationInput[] = [
  // Pacific Northwest (USA)
  { name: 'Snoqualmie', alternateNames: ['Snoqualmie Tribe'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Tulalip', alternateNames: ['Tulalip Tribes'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Quinault', alternateNames: ['Quinault Indian Nation'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Lummi', alternateNames: ['Lummi Nation', 'Lummi Indian Business Council'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Muckleshoot', alternateNames: ['Muckleshoot Indian Tribe'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Puyallup', alternateNames: ['Puyallup Tribe'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Yakama', alternateNames: ['Yakama Nation', 'Confederated Tribes and Bands of the Yakama Nation'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Spokane', alternateNames: ['Spokane Tribe'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Colville', alternateNames: ['Confederated Tribes of the Colville Reservation'], region: 'Pacific Northwest', country: 'USA' },
  { name: 'Nez Perce', alternateNames: ['Nimiipuu', 'Nez Perce Tribe'], region: 'Pacific Northwest', country: 'USA' },

  // Southwest (USA)
  { name: 'Navajo', alternateNames: ['Diné', 'Navajo Nation'], region: 'Southwest', country: 'USA' },
  { name: 'Hopi', alternateNames: ['Hopi Tribe'], region: 'Southwest', country: 'USA' },
  { name: 'Zuni', alternateNames: ['A:shiwi', 'Pueblo of Zuni'], region: 'Southwest', country: 'USA' },
  { name: 'Apache', alternateNames: ['Ndee', 'Apache Tribe'], region: 'Southwest', country: 'USA' },
  { name: 'Tohono O\'odham', alternateNames: ['Tohono O\'odham Nation', 'Desert People'], region: 'Southwest', country: 'USA' },
  { name: 'Acoma Pueblo', alternateNames: ['Acoma', 'Pueblo of Acoma', 'Sky City'], region: 'Southwest', country: 'USA' },
  { name: 'Laguna Pueblo', alternateNames: ['Laguna', 'Pueblo of Laguna'], region: 'Southwest', country: 'USA' },
  { name: 'Santo Domingo Pueblo', alternateNames: ['Kewa Pueblo', 'Santo Domingo'], region: 'Southwest', country: 'USA' },
  { name: 'Pima', alternateNames: ['Akimel O\'odham', 'River People'], region: 'Southwest', country: 'USA' },

  // Plains (USA)
  { name: 'Lakota', alternateNames: ['Lakota Sioux', 'Teton Sioux'], region: 'Plains', country: 'USA' },
  { name: 'Dakota', alternateNames: ['Dakota Sioux', 'Santee Sioux'], region: 'Plains', country: 'USA' },
  { name: 'Nakota', alternateNames: ['Nakota Sioux', 'Yankton Sioux'], region: 'Plains', country: 'USA' },
  { name: 'Cheyenne', alternateNames: ['Tsitsistas', 'Northern Cheyenne', 'Southern Cheyenne'], region: 'Plains', country: 'USA' },
  { name: 'Arapaho', alternateNames: ['Hinono\'eiteen', 'Northern Arapaho', 'Southern Arapaho'], region: 'Plains', country: 'USA' },
  { name: 'Crow', alternateNames: ['Apsáalooke', 'Crow Nation'], region: 'Plains', country: 'USA' },
  { name: 'Blackfeet', alternateNames: ['Blackfoot', 'Siksika', 'Blackfeet Nation'], region: 'Plains', country: 'USA' },
  { name: 'Comanche', alternateNames: ['Numunuu', 'Comanche Nation'], region: 'Plains', country: 'USA' },
  { name: 'Kiowa', alternateNames: ['Kiowa Tribe'], region: 'Plains', country: 'USA' },
  { name: 'Osage', alternateNames: ['Wazhazhe', 'Osage Nation'], region: 'Plains', country: 'USA' },

  // Great Lakes (USA)
  { name: 'Ojibwe', alternateNames: ['Chippewa', 'Anishinaabe', 'Ojibwa'], region: 'Great Lakes', country: 'USA' },
  { name: 'Potawatomi', alternateNames: ['Bodéwadmi', 'Citizen Potawatomi Nation'], region: 'Great Lakes', country: 'USA' },
  { name: 'Menominee', alternateNames: ['Menominee Indian Tribe'], region: 'Great Lakes', country: 'USA' },
  { name: 'Ho-Chunk', alternateNames: ['Winnebago', 'Ho-Chunk Nation'], region: 'Great Lakes', country: 'USA' },
  { name: 'Oneida', alternateNames: ['Oneida Nation', 'Onyota\'a:ka'], region: 'Great Lakes', country: 'USA' },
  { name: 'Odawa', alternateNames: ['Ottawa', 'Little Traverse Bay Bands of Odawa Indians'], region: 'Great Lakes', country: 'USA' },

  // Southeast (USA)
  { name: 'Cherokee', alternateNames: ['Tsalagi', 'Cherokee Nation', 'Eastern Band of Cherokee Indians'], region: 'Southeast', country: 'USA' },
  { name: 'Choctaw', alternateNames: ['Chahta', 'Choctaw Nation'], region: 'Southeast', country: 'USA' },
  { name: 'Chickasaw', alternateNames: ['Chickasaw Nation'], region: 'Southeast', country: 'USA' },
  { name: 'Muscogee', alternateNames: ['Creek', 'Muscogee (Creek) Nation', 'Mvskoke'], region: 'Southeast', country: 'USA' },
  { name: 'Seminole', alternateNames: ['Seminole Tribe', 'Seminole Nation'], region: 'Southeast', country: 'USA' },
  { name: 'Catawba', alternateNames: ['Catawba Indian Nation'], region: 'Southeast', country: 'USA' },

  // Northeast (USA)
  { name: 'Mohawk', alternateNames: ['Kanien\'kehá:ka', 'Mohawk Nation'], region: 'Northeast', country: 'USA' },
  { name: 'Seneca', alternateNames: ['Onödowá\'ga:', 'Seneca Nation'], region: 'Northeast', country: 'USA' },
  { name: 'Onondaga', alternateNames: ['Onöñda\'gega\'', 'Onondaga Nation'], region: 'Northeast', country: 'USA' },
  { name: 'Cayuga', alternateNames: ['Gayogo̱hó:nǫ\'', 'Cayuga Nation'], region: 'Northeast', country: 'USA' },
  { name: 'Tuscarora', alternateNames: ['Ska-Ruh-Reh', 'Tuscarora Nation'], region: 'Northeast', country: 'USA' },
  { name: 'Wampanoag', alternateNames: ['Wampanoag Tribe', 'People of the First Light'], region: 'Northeast', country: 'USA' },
  { name: 'Penobscot', alternateNames: ['Penobscot Nation'], region: 'Northeast', country: 'USA' },

  // Alaska (USA)
  { name: 'Tlingit', alternateNames: ['Lingít', 'Tlingit Nation'], region: 'Alaska', country: 'USA' },
  { name: 'Haida', alternateNames: ['X̱aad', 'Haida Nation'], region: 'Alaska', country: 'USA' },
  { name: 'Yup\'ik', alternateNames: ['Yupik', 'Yupiaq'], region: 'Alaska', country: 'USA' },
  { name: 'Inupiat', alternateNames: ['Iñupiat', 'Inupiaq'], region: 'Alaska', country: 'USA' },
  { name: 'Aleut', alternateNames: ['Unangan', 'Alutiiq'], region: 'Alaska', country: 'USA' },
  { name: 'Athabascan', alternateNames: ['Dene', 'Alaska Athabascan'], region: 'Alaska', country: 'USA' },

  // Canada
  { name: 'Cree', alternateNames: ['Nehiyaw', 'Cree Nation'], region: 'Canada', country: 'Canada' },
  { name: 'Métis', alternateNames: ['Métis Nation'], region: 'Canada', country: 'Canada' },
  { name: 'Inuit', alternateNames: ['Inuk'], region: 'Canada', country: 'Canada' },
  { name: 'Mohawk (Canada)', alternateNames: ['Kanien\'kehá:ka', 'Kahnawake', 'Akwesasne'], region: 'Canada', country: 'Canada' },
  { name: 'Haida (Canada)', alternateNames: ['X̱aad', 'Haida Gwaii'], region: 'Canada', country: 'Canada' },
  { name: 'Salish', alternateNames: ['Coast Salish', 'Salish Nation'], region: 'Canada', country: 'Canada' },
  { name: 'Blackfoot (Canada)', alternateNames: ['Siksika', 'Blackfoot Confederacy', 'Niitsitapi'], region: 'Canada', country: 'Canada' },
  { name: 'Mi\'kmaq', alternateNames: ['Micmac', 'Mi\'kmaw Nation', 'L\'nu'], region: 'Canada', country: 'Canada' },
];

// ============================================================================
// SAMPLE VENDOR DATA
// ============================================================================

function createSampleVendors(
  categoryMap: Map<string, string>,
  nationMap: Map<string, string>
): Partial<Vendor>[] {
  const now = admin.firestore.Timestamp.now();
  const ninetyDaysLater = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  );

  return [
    {
      id: generateId(),
      userId: 'sample-user-1',
      businessName: 'Silver Moon Jewelry',
      slug: 'silver-moon-jewelry',
      tagline: 'Handcrafted Navajo silver jewelry honoring traditional designs',
      description: `Silver Moon Jewelry continues a family tradition spanning four generations. Each piece is hand-forged using traditional Navajo silversmithing techniques passed down through our family.

Our work features authentic turquoise sourced from mines across the Southwest, including Kingman, Sleeping Beauty, and Royston turquoise. We specialize in squash blossom necklaces, concho belts, and statement rings that honor our heritage while appealing to contemporary tastes.

Every piece tells a story of our people and carries the spirit of the Southwest desert where we live and work.`,
      nation: 'Navajo',
      nationId: nationMap.get('Navajo') || '',
      additionalNations: [],
      website: 'https://silvermoonjewelry.example.com',
      email: 'contact@silvermoonjewelry.example.com',
      phone: '(505) 555-0123',
      profileImage: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400',
      coverImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920',
      gallery: [
        { url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800', caption: 'Turquoise cluster ring' },
        { url: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800', caption: 'Squash blossom necklace' },
        { url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800', caption: 'Sterling silver cuff' },
        { url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800', caption: 'Traditional earrings' },
      ],
      videoUrl: '',
      categories: ['Jewelry & Accessories', 'Rings', 'Necklaces', 'Bracelets'],
      categoryIds: [
        categoryMap.get('Jewelry & Accessories') || '',
        categoryMap.get('Rings') || '',
        categoryMap.get('Necklaces') || '',
        categoryMap.get('Bracelets') || '',
      ].filter(Boolean),
      materials: ['sterling silver', 'turquoise', 'coral', 'mother of pearl'],
      techniques: ['hand-forged', 'stamp work', 'overlay', 'inlay'],
      priceRange: 'premium',
      acceptsCustomOrders: true,
      madeToOrder: false,
      location: {
        city: 'Gallup',
        province: 'New Mexico',
        country: 'USA',
        region: 'Southwest',
      },
      socialLinks: {
        instagram: 'https://instagram.com/silvermoonjewelry',
        facebook: 'https://facebook.com/silvermoonjewelry',
        pinterest: 'https://pinterest.com/silvermoonjewelry',
      },
      status: 'active',
      verificationStatus: 'verified',
      verifiedAt: now,
      featured: true,
      profileCompleteness: 95,
      profileViews: 1250,
      websiteClicks: 340,
      favorites: 89,
      followers: 156,
      averageRating: 4.9,
      reviewCount: 23,
      newVendorBoostExpires: ninetyDaysLater,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId: 'sample-user-2',
      businessName: 'Raven\'s Wing Art Studio',
      slug: 'ravens-wing-art-studio',
      tagline: 'Contemporary Northwest Coast art rooted in Tlingit tradition',
      description: `Raven's Wing Art Studio creates contemporary interpretations of traditional Tlingit formline art. Our work bridges ancient traditions with modern expression, creating pieces that honor our ancestors while speaking to today's world.

Based in Juneau, Alaska, we draw inspiration from the land and waters of our homeland. Our prints and original paintings feature traditional crest animals including Raven, Eagle, Bear, and Killer Whale, rendered in the distinctive flowing lines of Northwest Coast design.

We also offer workshops teaching the fundamentals of formline design to help preserve and share this important artistic tradition.`,
      nation: 'Tlingit',
      nationId: nationMap.get('Tlingit') || '',
      additionalNations: ['Haida'],
      website: 'https://ravenswing.example.com',
      email: 'artist@ravenswing.example.com',
      phone: '(907) 555-0456',
      profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      coverImage: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920',
      gallery: [
        { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800', caption: 'Raven transformation print' },
        { url: 'https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=800', caption: 'Eagle spirit painting' },
        { url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800', caption: 'Bear mother original' },
      ],
      videoUrl: 'https://youtube.com/watch?v=example',
      categories: ['Art & Fine Crafts', 'Paintings', 'Prints'],
      categoryIds: [
        categoryMap.get('Art & Fine Crafts') || '',
        categoryMap.get('Paintings') || '',
        categoryMap.get('Prints') || '',
      ].filter(Boolean),
      materials: ['acrylic paint', 'canvas', 'archival paper', 'wood panel'],
      techniques: ['formline design', 'limited edition printing', 'hand-painted'],
      priceRange: 'luxury',
      acceptsCustomOrders: true,
      madeToOrder: true,
      location: {
        city: 'Juneau',
        province: 'Alaska',
        country: 'USA',
        region: 'Alaska',
      },
      socialLinks: {
        instagram: 'https://instagram.com/ravenswing',
        youtube: 'https://youtube.com/ravenswing',
      },
      status: 'active',
      verificationStatus: 'verified',
      verifiedAt: now,
      featured: false,
      profileCompleteness: 90,
      profileViews: 890,
      websiteClicks: 215,
      favorites: 67,
      followers: 112,
      averageRating: 5.0,
      reviewCount: 12,
      newVendorBoostExpires: ninetyDaysLater,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      userId: 'sample-user-3',
      businessName: 'Three Sisters Foods',
      slug: 'three-sisters-foods',
      tagline: 'Traditional Indigenous foods for modern tables',
      description: `Three Sisters Foods brings traditional Indigenous cuisine to your kitchen. Named after the sacred companion planting of corn, beans, and squash practiced by our Cherokee ancestors, we create food products that honor our agricultural heritage.

Our product line includes:
- Wild rice harvested from traditional waters
- Hominy and corn-based products
- Traditional seasonings and spice blends
- Maple syrup and birch syrup products
- Dried herbs and teas

All our products are sourced from Indigenous producers across Turtle Island, supporting Native food sovereignty and economic development.`,
      nation: 'Cherokee',
      nationId: nationMap.get('Cherokee') || '',
      additionalNations: [],
      website: 'https://threesistersfoods.example.com',
      email: 'orders@threesistersfoods.example.com',
      phone: '(918) 555-0789',
      profileImage: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=400',
      coverImage: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1920',
      gallery: [
        { url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', caption: 'Wild rice blend' },
        { url: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=800', caption: 'Traditional spice collection' },
        { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', caption: 'Three Sisters harvest' },
      ],
      videoUrl: '',
      categories: ['Food & Beverage', 'Traditional Foods', 'Seasonings & Spices'],
      categoryIds: [
        categoryMap.get('Food & Beverage') || '',
        categoryMap.get('Traditional Foods') || '',
        categoryMap.get('Seasonings & Spices') || '',
      ].filter(Boolean),
      materials: ['wild rice', 'corn', 'beans', 'squash', 'maple syrup'],
      techniques: ['traditional harvesting', 'hand-processed', 'small-batch'],
      priceRange: 'mid',
      acceptsCustomOrders: false,
      madeToOrder: false,
      location: {
        city: 'Tahlequah',
        province: 'Oklahoma',
        country: 'USA',
        region: 'Southeast',
      },
      socialLinks: {
        instagram: 'https://instagram.com/threesistersfoods',
        facebook: 'https://facebook.com/threesistersfoods',
      },
      status: 'active',
      verificationStatus: 'verified',
      verifiedAt: now,
      featured: false,
      profileCompleteness: 85,
      profileViews: 560,
      websiteClicks: 180,
      favorites: 45,
      followers: 78,
      averageRating: 4.8,
      reviewCount: 18,
      newVendorBoostExpires: ninetyDaysLater,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedCategories(): Promise<Map<string, string>> {
  console.log('\n📦 Seeding categories...');

  const categoryMap = new Map<string, string>();
  const now = admin.firestore.Timestamp.now();
  let batch = db.batch();
  let count = 0;
  let order = 0;

  for (const cat of categoryData) {
    // Create parent category
    const parentId = generateId();
    const parentSlug = slugify(cat.name);
    categoryMap.set(cat.name, parentId);

    const parentCategory: Category = {
      id: parentId,
      name: cat.name,
      slug: parentSlug,
      description: cat.description,
      parentId: null,
      order: order++,
      vendorCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    batch.set(db.collection('categories').doc(parentId), parentCategory);
    count++;

    // Create subcategories
    let subOrder = 0;
    for (const sub of cat.subcategories) {
      const subId = generateId();
      const subSlug = slugify(sub.name);
      categoryMap.set(sub.name, subId);

      const subCategory: Category = {
        id: subId,
        name: sub.name,
        slug: subSlug,
        description: sub.description,
        parentId: parentId,
        order: subOrder++,
        vendorCount: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(db.collection('categories').doc(subId), subCategory);
      count++;

      if (count >= 400) {
        await batch.commit();
        console.log(`   Saved ${count} categories...`);
        batch = db.batch();
        count = 0;
      }
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  const totalCategories = categoryData.reduce((acc, cat) => acc + 1 + cat.subcategories.length, 0);
  console.log(`   ✅ Created ${totalCategories} categories (${categoryData.length} parent, ${totalCategories - categoryData.length} subcategories)`);

  return categoryMap;
}

async function seedNations(): Promise<Map<string, string>> {
  console.log('\n📦 Seeding nations...');

  const nationMap = new Map<string, string>();
  const now = admin.firestore.Timestamp.now();
  let batch = db.batch();
  let count = 0;

  for (const nation of nationData) {
    const nationId = generateId();
    const nationSlug = slugify(nation.name);
    nationMap.set(nation.name, nationId);

    const nationDoc: Nation = {
      id: nationId,
      name: nation.name,
      slug: nationSlug,
      alternateNames: nation.alternateNames,
      region: nation.region,
      country: nation.country,
      vendorCount: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    batch.set(db.collection('nations').doc(nationId), nationDoc);
    count++;

    if (count >= 400) {
      await batch.commit();
      console.log(`   Saved ${count} nations...`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`   ✅ Created ${nationData.length} nations across ${new Set(nationData.map(n => n.region)).size} regions`);

  return nationMap;
}

async function seedVendors(
  categoryMap: Map<string, string>,
  nationMap: Map<string, string>
): Promise<void> {
  console.log('\n📦 Seeding sample vendors...');

  const vendors = createSampleVendors(categoryMap, nationMap);
  let batch = db.batch();

  for (const vendor of vendors) {
    if (vendor.id) {
      batch.set(db.collection('vendors').doc(vendor.id), vendor);
    }
  }

  await batch.commit();

  console.log(`   ✅ Created ${vendors.length} sample vendors`);

  // Update vendor counts for categories and nations
  await updateVendorCounts(categoryMap, nationMap, vendors);
}

async function updateVendorCounts(
  categoryMap: Map<string, string>,
  nationMap: Map<string, string>,
  vendors: Partial<Vendor>[]
): Promise<void> {
  console.log('\n📦 Updating vendor counts...');

  // Count vendors per category
  const categoryCounts = new Map<string, number>();
  for (const vendor of vendors) {
    if (vendor.categoryIds) {
      for (const catId of vendor.categoryIds) {
        categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
      }
    }
  }

  // Count vendors per nation
  const nationCounts = new Map<string, number>();
  for (const vendor of vendors) {
    if (vendor.nationId) {
      nationCounts.set(vendor.nationId, (nationCounts.get(vendor.nationId) || 0) + 1);
    }
  }

  // Update categories
  let batch = db.batch();
  let count = 0;

  for (const [catId, vendorCount] of categoryCounts) {
    batch.update(db.collection('categories').doc(catId), { vendorCount });
    count++;
  }

  for (const [nationId, vendorCount] of nationCounts) {
    batch.update(db.collection('nations').doc(nationId), { vendorCount });
    count++;
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`   ✅ Updated vendor counts for ${categoryCounts.size} categories and ${nationCounts.size} nations`);
}

async function clearExistingData(): Promise<void> {
  console.log('\n🧹 Clearing existing Shop Indigenous data...');

  const collections = ['categories', 'nations', 'vendors', 'favorites', 'follows', 'reviews', 'featuredRotation'];

  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).limit(500).get();

      if (snapshot.empty) {
        continue;
      }

      let batch = db.batch();
      let count = 0;

      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      console.log(`   Cleared ${snapshot.size} documents from ${collectionName}`);
    } catch (error) {
      // Collection might not exist, continue
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function run() {
  console.log('🚀 Starting Shop Indigenous Seed Script...');
  console.log('================================================');

  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear') || args.includes('-c');

  if (shouldClear) {
    await clearExistingData();
  }

  // Seed in order
  const categoryMap = await seedCategories();
  const nationMap = await seedNations();
  await seedVendors(categoryMap, nationMap);

  console.log('\n================================================');
  console.log('✨ Shop Indigenous seeding complete!');
  console.log('\nSummary:');
  console.log(`   - Categories: ${categoryData.reduce((acc, cat) => acc + 1 + cat.subcategories.length, 0)}`);
  console.log(`   - Nations: ${nationData.length}`);
  console.log(`   - Sample Vendors: 3`);
  console.log('\nNext steps:');
  console.log('   1. Deploy Firestore rules: firebase deploy --only firestore:rules');
  console.log('   2. Run the app and visit /shop to see the data');

  process.exit(0);
}

run().catch((error) => {
  console.error('❌ Error running seed script:', error);
  process.exit(1);
});

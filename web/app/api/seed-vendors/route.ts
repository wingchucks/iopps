import { NextResponse } from "next/server";
import { db as adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Helper to generate slug from business name
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function generateUniqueSlug(businessName: string): string {
    const baseSlug = slugify(businessName);
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${uniqueSuffix}`;
}

const VENDORS = [
    {
        businessName: "Spirit Bear Designs",
        category: "Traditional Arts",
        nation: "Coast Salish",
        location: "Vancouver, BC",
        description: "Handcrafted traditional Coast Salish art, including carvings, prints, and jewelry. Each piece tells a story of our heritage and connection to the land.",
        offerings: "Wood carvings, silver jewelry, limited edition prints",
        tags: ["art", "carving", "jewelry", "coast salish"],
    },
    {
        businessName: "Red Willow Pottery",
        category: "Traditional Arts",
        nation: "Ojibwe",
        location: "Thunder Bay, ON",
        description: "Contemporary pottery inspired by traditional Ojibwe designs and patterns. Functional and decorative pieces for your home.",
        offerings: "Bowls, mugs, vases, decorative plates",
        tags: ["pottery", "ceramics", "ojibwe", "home decor"],
    },
    {
        businessName: "Northern Sage Wellness",
        category: "Health & Wellness",
        nation: "Cree",
        location: "Edmonton, AB",
        description: "Holistic wellness products made with traditional medicines and sustainable ingredients. Soaps, salves, and teas for body and spirit.",
        offerings: "Herbal teas, natural soaps, healing salves, essential oils",
        tags: ["wellness", "natural", "cree", "herbal"],
    },
    {
        businessName: "Thunderbird Clothing Co.",
        category: "Clothing & Accessories",
        nation: "Haida",
        location: "Victoria, BC",
        description: "Modern streetwear featuring bold Haida formline art. Clothing that celebrates Indigenous identity and resilience.",
        offerings: "T-shirts, hoodies, hats, accessories",
        tags: ["clothing", "fashion", "haida", "streetwear"],
    },
    {
        businessName: "Maple Moon Bakery",
        category: "Food & Beverages",
        nation: "Mohawk",
        location: "Montreal, QC",
        description: "Artisanal bakery specializing in treats made with maple syrup and traditional ingredients. Sweet and savory delights for every occasion.",
        offerings: "Maple cookies, bannock, fruit pies, savory tarts",
        tags: ["bakery", "food", "mohawk", "maple"],
    },
    {
        businessName: "Eagle Feather Books",
        category: "Education & Workshops",
        nation: "Métis",
        location: "Winnipeg, MB",
        description: "Independent bookstore featuring Indigenous authors and stories. Promoting literacy and cultural understanding through literature.",
        offerings: "Books, educational resources, storytelling workshops",
        tags: ["books", "education", "metis", "literature"],
    },
    {
        businessName: "Woven Dreams Studio",
        category: "Clothing & Accessories",
        nation: "Navajo",
        location: "Santa Fe, NM",
        description: "Exquisite hand-woven textiles and rugs using traditional Navajo techniques. timeless pieces that bring warmth and beauty to any space.",
        offerings: "Rugs, blankets, wall hangings, woven accessories",
        tags: ["weaving", "textiles", "navajo", "home decor"],
    },
    {
        businessName: "Morning Star Jewelry",
        category: "Jewelry & Beadwork",
        nation: "Lakota",
        location: "Rapid City, SD",
        description: "Intricate beadwork and silver jewelry inspired by Lakota star knowledge and patterns. Wearable art that honors our ancestors.",
        offerings: "Beaded earrings, necklaces, bracelets, silver rings",
        tags: ["jewelry", "beadwork", "lakota", "silver"],
    },
    {
        businessName: "Raven's Nest Consulting",
        category: "Professional Services",
        nation: "Tlingit",
        location: "Seattle, WA",
        description: "Indigenous-led consulting firm specializing in cultural competency training, community engagement, and strategic planning.",
        offerings: "Workshops, consulting services, speaking engagements",
        tags: ["consulting", "services", "tlingit", "training"],
    },
    {
        businessName: "Cedar & Smoke",
        category: "Food & Beverages",
        nation: "Squamish",
        location: "North Vancouver, BC",
        description: "Authentic Indigenous cuisine with a modern twist. Catering services and pop-up dinners featuring local, seasonal ingredients.",
        offerings: "Catering, meal kits, specialty sauces, smoked fish",
        tags: ["food", "catering", "squamish", "cuisine"],
    },
];

export async function POST() {
    try {
        if (!adminDb) {
            const debugInfo = {
                hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
                hasServiceAccountJson: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
                hasServiceAccountBase64: !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
                useEmulators: process.env.NEXT_PUBLIC_USE_EMULATORS,
                nodeEnv: process.env.NODE_ENV,
            };
            return NextResponse.json(
                { error: "Firebase Admin not initialized", debug: debugInfo },
                { status: 500 }
            );
        }

        const batch = adminDb.batch();
        const vendorsRef = adminDb.collection("vendors");
        const shopRef = adminDb.collection("shopListings");

        const createdVendors = [];

        for (const vendor of VENDORS) {
            // Create a fake user ID for the vendor
            const userId = `seed_vendor_${Math.random().toString(36).substring(2, 10)}`;
            const vendorDocRef = vendorsRef.doc(userId);

            const slug = generateUniqueSlug(vendor.businessName);
            const now = Timestamp.now();

            const vendorData = {
                id: userId,
                ownerUserId: userId,
                businessName: vendor.businessName,
                category: vendor.category,
                location: vendor.location,
                about: vendor.description,
                offerings: vendor.offerings,
                isIndigenousOwned: true,
                approvalStatus: "approved",
                status: "active",
                verificationStatus: Math.random() > 0.7 ? "verified" : "pending",
                slug,
                featured: Math.random() > 0.8,
                logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.businessName)}&background=random`,
                heroImageUrl: `https://source.unsplash.com/random/1200x400/?${vendor.tags[0]}`,
                websiteUrl: `https://example.com/${slug}`,
                contactEmail: `contact@${slug}.com`,
                createdAt: now,
                updatedAt: now,
                profileViews: Math.floor(Math.random() * 500),
                websiteClicks: Math.floor(Math.random() * 100),
                favorites: Math.floor(Math.random() * 50),
                followers: Math.floor(Math.random() * 200),

                // Extended fields for shop display
                categories: [vendor.category],
                categoryIds: [vendor.category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')],
                tags: vendor.tags,
                socialLinks: {
                    instagram: `@${slug.replace(/-/g, '')}`,
                    facebook: `${vendor.businessName}`,
                }
            };

            batch.set(vendorDocRef, vendorData);
            createdVendors.push(vendor.businessName);

            // Create a corresponding shop listing (legacy collection, but good to have)
            const shopDocRef = shopRef.doc();
            batch.set(shopDocRef, {
                id: shopDocRef.id,
                employerId: userId,
                vendorId: userId,
                owner: vendor.businessName,
                name: vendor.businessName,
                description: vendor.description,
                category: vendor.category,
                location: vendor.location,
                active: true,
                createdAt: now,
                tags: vendor.tags,
            });
        }

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: `Successfully seeded ${createdVendors.length} vendors`,
            vendors: createdVendors,
        });
    } catch (error: any) {
        console.error("Error seeding vendors:", error);
        return NextResponse.json(
            { error: error.message || "Failed to seed vendors" },
            { status: 500 }
        );
    }
}

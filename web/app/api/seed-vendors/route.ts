/**
 * Seed Vendors API - Creates 10 fake Shop Indigenous vendor profiles
 * DELETE after testing
 */

import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Vendor, VendorCategory, NorthAmericanRegion } from '@/lib/types';

function generateSlug(businessName: string): string {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

const SEED_VENDORS: Array<{
  businessName: string;
  tagline: string;
  description: string;
  category: VendorCategory;
  nation: string;
  location: string;
  region: NorthAmericanRegion;
  offersShipping: boolean;
  onlineOnly: boolean;
  email: string;
  website: string;
  instagram: string;
  communityStory: string;
  logoUrl: string;
}> = [
  {
    businessName: 'Spirit Bear Designs',
    tagline: 'Traditional art meets modern style',
    description: 'Spirit Bear Designs creates stunning handcrafted jewelry and art pieces that blend traditional Coast Salish designs with contemporary aesthetics. Each piece tells a story of our ancestors and carries the spirit of the Pacific Northwest.',
    category: 'Art & Crafts',
    nation: 'Coast Salish',
    location: 'Vancouver',
    region: 'British Columbia',
    offersShipping: true,
    onlineOnly: false,
    email: 'hello@spiritbeardesigns.ca',
    website: 'https://spiritbeardesigns.ca',
    instagram: '@spiritbeardesigns',
    communityStory: 'Our family has been creating art for five generations. We learned from our grandmothers and continue to pass these traditions to our children.',
    logoUrl: 'https://images.unsplash.com/photo-1617503752587-97d2103a96ea?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Red Willow Pottery',
    tagline: 'Earth, fire, and tradition',
    description: 'Handcrafted pottery inspired by traditional Indigenous designs. Each piece is made with locally sourced clay and fired using traditional methods passed down through generations.',
    category: 'Art & Crafts',
    nation: 'Ojibwe',
    location: 'Thunder Bay',
    region: 'Ontario',
    offersShipping: true,
    onlineOnly: false,
    email: 'info@redwillowpottery.com',
    website: 'https://redwillowpottery.com',
    instagram: '@redwillowpottery',
    communityStory: 'I started pottery as a way to connect with my grandmother\'s teachings. Now it\'s my way of sharing our culture with the world.',
    logoUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Northern Sage Wellness',
    tagline: 'Healing through traditional medicine',
    description: 'We offer traditional Indigenous wellness products including herbal teas, smudging supplies, and natural skincare made with wild-harvested ingredients from the boreal forest.',
    category: 'Health & Wellness',
    nation: 'Cree',
    location: 'Edmonton',
    region: 'Alberta',
    offersShipping: true,
    onlineOnly: true,
    email: 'wellness@northernsage.ca',
    website: 'https://northernsage.ca',
    instagram: '@northernsagewellness',
    communityStory: 'My grandmother was a medicine woman. I\'ve spent 20 years learning traditional plant medicine to share healing with our community.',
    logoUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Thunderbird Clothing Co.',
    tagline: 'Wear your heritage with pride',
    description: 'Contemporary Indigenous streetwear featuring bold designs inspired by traditional stories and symbols. Our clothing celebrates Indigenous identity while making a statement.',
    category: 'Clothing & Apparel',
    nation: 'Haida',
    location: 'Victoria',
    region: 'British Columbia',
    offersShipping: true,
    onlineOnly: true,
    email: 'orders@thunderbirdclothing.ca',
    website: 'https://thunderbirdclothing.ca',
    instagram: '@thunderbirdclothingco',
    communityStory: 'Started in my basement with a screen printer and a dream. Now we ship our designs across Turtle Island.',
    logoUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Maple Moon Bakery',
    tagline: 'Traditional treats, made with love',
    description: 'Specializing in Indigenous-inspired baked goods including bannock, wild berry pies, and maple-infused treats. All made fresh using traditional recipes and local ingredients.',
    category: 'Food & Beverages',
    nation: 'Mohawk',
    location: 'Montreal',
    region: 'Quebec',
    offersShipping: false,
    onlineOnly: false,
    email: 'bakery@maplemoon.ca',
    website: 'https://maplemoon.ca',
    instagram: '@maplemoonbakery',
    communityStory: 'Baking has always been how our family showed love. Every recipe here was perfected over generations at community gatherings.',
    logoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Eagle Feather Books',
    tagline: 'Stories that soar',
    description: 'Publishing house dedicated to amplifying Indigenous voices. We publish children\'s books, poetry, and novels by Indigenous authors, all featuring stunning artwork by Indigenous artists.',
    category: 'Books & Media',
    nation: 'Métis',
    location: 'Winnipeg',
    region: 'Manitoba',
    offersShipping: true,
    onlineOnly: true,
    email: 'submissions@eaglefeatherbooks.ca',
    website: 'https://eaglefeatherbooks.ca',
    instagram: '@eaglefeatherbooks',
    communityStory: 'We believe every Indigenous child deserves to see themselves in the books they read. That\'s why we publish stories by and for our communities.',
    logoUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Woven Dreams Studio',
    tagline: 'Threads of tradition',
    description: 'Handwoven textiles including blankets, scarves, and wall hangings. Each piece incorporates traditional weaving techniques and patterns that have been passed down for centuries.',
    category: 'Home & Living',
    nation: 'Navajo',
    location: 'Santa Fe',
    region: 'New Mexico',
    offersShipping: true,
    onlineOnly: false,
    email: 'studio@wovendreams.com',
    website: 'https://wovendreams.com',
    instagram: '@wovendreamsstudio',
    communityStory: 'I learned to weave from my mother, who learned from her mother. Each blanket takes weeks to create and carries prayers woven into every thread.',
    logoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Morning Star Jewelry',
    tagline: 'Adornments with meaning',
    description: 'Fine jewelry crafted in sterling silver and gold, featuring traditional Lakota beadwork and contemporary designs. Each piece is blessed and carries spiritual significance.',
    category: 'Jewelry & Accessories',
    nation: 'Lakota',
    location: 'Rapid City',
    region: 'South Dakota',
    offersShipping: true,
    onlineOnly: true,
    email: 'orders@morningstarjewelry.com',
    website: 'https://morningstarjewelry.com',
    instagram: '@morningstarjewelry',
    communityStory: 'Jewelry-making was almost lost in our family. I spent years researching and learning to bring back these sacred designs.',
    logoUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Raven\'s Nest Consulting',
    tagline: 'Building bridges through understanding',
    description: 'We provide Indigenous cultural training, consultation services, and workshops for organizations looking to meaningfully engage with Indigenous communities and implement reconciliation practices.',
    category: 'Services',
    nation: 'Tlingit',
    location: 'Seattle',
    region: 'Washington',
    offersShipping: false,
    onlineOnly: true,
    email: 'consult@ravensnest.ca',
    website: 'https://ravensnest.ca',
    instagram: '@ravensnestconsulting',
    communityStory: 'After 15 years in corporate Canada, I realized the best way I could serve my community was by teaching others about our ways.',
    logoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  },
  {
    businessName: 'Cedar & Smoke',
    tagline: 'Taste the land',
    description: 'Artisanal smoked salmon, wild game jerky, and traditional preserves made using time-honored smoking and curing techniques. All ingredients are ethically sourced from traditional territories.',
    category: 'Food & Beverages',
    nation: 'Squamish',
    location: 'North Vancouver',
    region: 'British Columbia',
    offersShipping: true,
    onlineOnly: false,
    email: 'orders@cedarandsmoke.ca',
    website: 'https://cedarandsmoke.ca',
    instagram: '@cedarandsmoke',
    communityStory: 'Our smokehouse has been in operation for over 40 years. We still use the same cedar planks and traditional methods as our ancestors.',
    logoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop',
  },
];

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  try {
    const createdVendors: string[] = [];

    for (const vendorData of SEED_VENDORS) {
      const vendor: Omit<Vendor, 'id'> = {
        ...vendorData,
        userId: `seed-user-${Math.random().toString(36).substring(2, 8)}`,
        slug: generateSlug(vendorData.businessName),
        status: 'active', // Make them visible immediately
        featured: Math.random() > 0.7, // 30% chance of being featured
        verified: Math.random() > 0.5, // 50% chance of being verified
        viewCount: Math.floor(Math.random() * 500) + 50,
        phone: '',
        facebook: '',
        tiktok: '',
        coverImageUrl: '',
        galleryImages: [],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      const docRef = await addDoc(collection(db, 'vendors'), vendor);
      createdVendors.push(docRef.id);
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdVendors.length} vendor profiles`,
      vendorIds: createdVendors,
    });
  } catch (error) {
    console.error('Error seeding vendors:', error);
    return NextResponse.json({ error: 'Failed to seed vendors' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed 10 fake vendor profiles',
    vendors: SEED_VENDORS.map(v => v.businessName),
  });
}

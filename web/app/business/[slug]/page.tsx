import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPinIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckBadgeIcon,
  ArrowLeftIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { FeedLayout } from '@/components/opportunity-graph';
import { getVendorBySlug, getVendorBySlugAnyStatus, getVendorProducts, incrementVendorViews } from '@/lib/firebase/shop';
import type { Vendor, VendorProduct } from '@/lib/types';
import { generateVendorSchema, buildMetadata } from '@/lib/seo';
import VendorInquiryForm from '@/components/shop/VendorInquiryForm';

// Social icons
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    return {
      title: 'Business Not Found',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://iopps.ca';
  const ogImageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(vendor.businessName)}&type=business&subtitle=${encodeURIComponent(vendor.tagline || vendor.category)}${vendor.logoUrl ? `&image=${encodeURIComponent(vendor.logoUrl)}` : ''}`;

  const description = vendor.tagline || vendor.description?.substring(0, 160) || `Shop ${vendor.category} from ${vendor.businessName} - an Indigenous-owned business`;

  return buildMetadata({
    title: vendor.businessName,
    description,
    path: `/business/${slug}`,
    image: vendor.coverImageUrl || ogImageUrl,
    type: "website",
  });
}

// Status banner component for non-active vendors
function StatusBanner({ status }: { status: string }) {
  if (status === 'active') return null;

  const statusConfig = {
    draft: {
      icon: EyeIcon,
      bgColor: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-600',
      title: 'Preview Mode - Draft Listing',
      message: 'This listing is not yet published. Only you can see this preview.',
    },
    pending: {
      icon: ClockIcon,
      bgColor: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-600',
      title: 'Preview Mode - Pending Approval',
      message: 'This listing is awaiting admin approval before it becomes visible to the public.',
    },
    suspended: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-red-50 border-red-200',
      textColor: 'text-red-600',
      title: 'Listing Suspended',
      message: 'This listing has been suspended. Please contact support for more information.',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <div className={`mb-6 rounded-xl border ${config.bgColor} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 flex-shrink-0 ${config.textColor}`} />
        <div>
          <h3 className={`font-semibold ${config.textColor}`}>{config.title}</h3>
          <p className="mt-1 text-sm text-foreground0">{config.message}</p>
        </div>
      </div>
    </div>
  );
}

async function VendorPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreviewMode = preview === 'true';

  // If preview mode, get vendor regardless of status
  // Otherwise, only get active vendors
  const vendor = isPreviewMode
    ? await getVendorBySlugAnyStatus(slug)
    : await getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  // Only increment view count for active vendors (not previews)
  if (vendor.status === 'active') {
    incrementVendorViews(vendor.id).catch((err) => {
      console.warn("Failed to track vendor view:", err);
    });
  }

  // Get vendor products
  const products = await getVendorProducts(vendor.id);

  // Generate JSON-LD schema for SEO
  const vendorSchema = generateVendorSchema({
    businessName: vendor.businessName,
    description: vendor.description,
    category: vendor.category,
    location: vendor.location,
    region: vendor.region,
    website: vendor.website,
    email: vendor.email,
    phone: vendor.phone,
    logoUrl: vendor.logoUrl,
    isIndigenousOwned: true,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vendorSchema) }}
      />
      <FeedLayout activeNav="business" fullWidth>
        {/* Status Banner for non-active vendors */}
        <StatusBanner status={vendor.status} />

        {/* Back Link */}
        <Link
          href="/business"
          className="inline-flex items-center gap-2 text-sm text-foreground0 transition-colors hover:text-teal-600 mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Indigenous Marketplace
        </Link>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 mb-8">
          {/* Cover Image */}
          <div className="relative h-64 sm:h-80 overflow-hidden">
            {vendor.coverImageUrl ? (
              <Image
                src={vendor.coverImageUrl}
                alt={vendor.businessName}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${vendor.themeColor || '#0d9488'}30, ${vendor.themeColor || '#0d9488'}60, #0f172a)`
                }}
              >
                {/* Decorative pattern overlay for visual interest */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, ${vendor.themeColor || '#14b8a6'}40 0%, transparent 50%),
                                      radial-gradient(circle at 80% 20%, ${vendor.themeColor || '#14b8a6'}30 0%, transparent 40%),
                                      radial-gradient(circle at 40% 80%, ${vendor.themeColor || '#14b8a6'}20 0%, transparent 45%)`
                  }}
                />
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${vendor.themeColor || '#14b8a6'}20 1px, transparent 1px),
                                      linear-gradient(to bottom, ${vendor.themeColor || '#14b8a6'}20 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                  }}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent" />

            {/* Badges */}
            <div className="absolute top-4 right-4 flex gap-2">
              {vendor.featured && (
                <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Featured
                </span>
              )}
              {vendor.verified && (
                <span className="flex items-center gap-1.5 rounded-full bg-accent/90 backdrop-blur-sm px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
                  <CheckBadgeIcon className="h-4 w-4" />
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="relative px-6 pb-6 sm:px-8">
            {/* Logo */}
            <div className="absolute -top-12 left-6 sm:left-8">
              <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-xl">
                {vendor.logoUrl ? (
                  <Image
                    src={vendor.logoUrl}
                    alt={`${vendor.businessName} logo`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-3xl font-bold text-white"
                    style={{ backgroundColor: vendor.themeColor || '#0d9488' }}
                  >
                    {vendor.businessName.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="pt-16 sm:pt-4 sm:pl-32">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{vendor.businessName}</h1>
                  {vendor.tagline && (
                    <p className="mt-1 text-lg text-foreground0">{vendor.tagline}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-slate-900"
                      style={{ backgroundColor: `${vendor.themeColor || '#14b8a6'}33`, color: vendor.themeColor || '#2dd4bf' }}
                    >
                      {vendor.category}
                    </span>
                    {vendor.nation && (
                      <span className="text-sm text-foreground0">{vendor.nation}</span>
                    )}
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-3">
                  {vendor.instagram && (
                    <a
                      href={`https://instagram.com/${vendor.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-foreground0 transition-colors hover:bg-pink-50 hover:text-pink-600"
                    >
                      <InstagramIcon className="h-5 w-5" />
                    </a>
                  )}
                  {vendor.facebook && (
                    <a
                      href={vendor.facebook.startsWith('http') ? vendor.facebook : `https://facebook.com/${vendor.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-foreground0 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <FacebookIcon className="h-5 w-5" />
                    </a>
                  )}
                  {vendor.tiktok && (
                    <a
                      href={`https://tiktok.com/@${vendor.tiktok.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-foreground0 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <TikTokIcon className="h-5 w-5" />
                    </a>
                  )}
                  {vendor.website && (
                    <a
                      href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-foreground0 transition-colors hover:bg-teal-50 hover:text-teal-600"
                    >
                      <GlobeAltIcon className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section className="rounded-2xl bg-white border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">About</h2>
              <p className="text-slate-600 whitespace-pre-wrap">{vendor.description}</p>
            </section>

            {/* Community Story */}
            {vendor.communityStory && (
              <section className="rounded-2xl bg-white border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Our Story</h2>
                <p className="text-slate-600 whitespace-pre-wrap">{vendor.communityStory}</p>
              </section>
            )}

            {/* Products */}
            {products.length > 0 && (
              <section className="rounded-2xl bg-white border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Products & Services</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} themeColor={vendor.themeColor} />
                  ))}
                </div>
              </section>
            )}

            {/* Gallery */}
            {vendor.galleryImages && vendor.galleryImages.length > 0 && (
              <section className="rounded-2xl bg-white border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Gallery</h2>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                  {vendor.galleryImages.map((image, index) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-xl">
                      <Image
                        src={image}
                        alt={`${vendor.businessName} gallery image ${index + 1}`}
                        fill
                        className="object-cover transition-transform hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Contact</h3>
              <div className="space-y-3">
                {vendor.location && (
                  <div className="flex items-start gap-3 text-slate-600">
                    <MapPinIcon className="h-5 w-5 text-foreground0 flex-shrink-0 mt-0.5" />
                    <div>
                      <p>{vendor.location}</p>
                      <p className="text-sm text-foreground0">{vendor.region}</p>
                    </div>
                  </div>
                )}
                {vendor.email && (
                  <a
                    href={`mailto:${vendor.email}`}
                    className="flex items-center gap-3 text-slate-600 hover:text-teal-600 transition-colors"
                  >
                    <EnvelopeIcon className="h-5 w-5 text-foreground0" />
                    {vendor.email}
                  </a>
                )}
                {vendor.phone && (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="flex items-center gap-3 text-slate-600 hover:text-teal-600 transition-colors"
                  >
                    <PhoneIcon className="h-5 w-5 text-foreground0" />
                    {vendor.phone}
                  </a>
                )}
              </div>

              {/* Website Button */}
              {vendor.website && (
                <a
                  href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:opacity-90"
                  style={{ backgroundColor: vendor.themeColor || '#14b8a6', boxShadow: `0 10px 15px -3px ${vendor.themeColor || '#14b8a6'}40` }}
                >
                  <GlobeAltIcon className="h-5 w-5" />
                  Visit Website
                </a>
              )}
            </div>

            {/* Shipping Info */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Shipping & Location</h3>
              <div className="space-y-3">
                {vendor.offersShipping && (
                  <div className="flex items-center gap-3" style={{ color: vendor.themeColor || '#2dd4bf' }}>
                    <TruckIcon className="h-5 w-5" />
                    <span>Offers Shipping</span>
                  </div>
                )}
                {vendor.onlineOnly ? (
                  <div className="flex items-center gap-3 text-foreground0">
                    <GlobeAltIcon className="h-5 w-5" />
                    <span>Online only</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-foreground0">
                    <MapPinIcon className="h-5 w-5" />
                    <span>Physical location available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Inquiry Form - Only show for active vendors */}
            {vendor.status === 'active' && (
              <VendorInquiryForm
                vendorId={vendor.id}
                vendorName={vendor.businessName}
                themeColor={vendor.themeColor}
              />
            )}
          </div>
        </div>
      </FeedLayout>
    </>
  );
}

function ProductCard({ product, themeColor }: { product: VendorProduct; themeColor?: string }) {
  const color = themeColor || '#2dd4bf'; // Default teal-400
  return (
    <div
      className="group overflow-hidden rounded-xl bg-white border border-slate-200 transition-all hover:border-opacity-100"
      style={{ borderColor: 'rgba(226, 232, 240, 1)' }} // Default border
    >
      {product.imageUrl && (
        <div className="relative h-40 overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <h4 className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors" style={{ color: undefined }} /* We want hover effect */>
          {product.name}
        </h4>
        <p className="mt-1 text-sm text-foreground0 line-clamp-2">{product.description}</p>
        {(product.priceDisplay || product.price) && (
          <p className="mt-2 font-semibold" style={{ color }}>
            {product.priceDisplay || `$${(product.price! / 100).toFixed(2)}`}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs text-foreground0">
          {product.madeToOrder && <span className="rounded bg-slate-100 px-2 py-0.5">Made to order</span>}
          {!product.inStock && <span className="rounded bg-amber-50 text-amber-600 px-2 py-0.5">Out of stock</span>}
        </div>
      </div>
    </div>
  );
}

export default VendorPage;

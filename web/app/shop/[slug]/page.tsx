import { notFound } from 'next/navigation';
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
} from '@heroicons/react/24/outline';
import { PageShell } from '@/components/PageShell';
import { getVendorBySlug, getVendorProducts, incrementVendorViews } from '@/lib/firebase/shop';
import type { Vendor, VendorProduct } from '@/lib/types';

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
}

async function VendorPage({ params }: Props) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  // Increment view count (fire and forget)
  incrementVendorViews(vendor.id).catch(() => {});

  // Get vendor products
  const products = await getVendorProducts(vendor.id);

  return (
    <PageShell className="pb-24">
      {/* Back Link */}
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-teal-400 mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Shop Indigenous
      </Link>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-800/50 border border-slate-700 mb-8">
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
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />

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
              <span className="flex items-center gap-1.5 rounded-full bg-teal-500/90 backdrop-blur-sm px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
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
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-slate-900 bg-slate-800 shadow-xl">
              {vendor.logoUrl ? (
                <Image
                  src={vendor.logoUrl}
                  alt={`${vendor.businessName} logo`}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 to-teal-600 text-3xl font-bold text-white">
                  {vendor.businessName.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 sm:pt-4 sm:pl-32">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">{vendor.businessName}</h1>
                {vendor.tagline && (
                  <p className="mt-1 text-lg text-slate-400">{vendor.tagline}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-teal-500/10 px-3 py-1 text-sm font-medium text-teal-400">
                    {vendor.category}
                  </span>
                  {vendor.nation && (
                    <span className="text-sm text-slate-500">{vendor.nation}</span>
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
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-slate-400 transition-colors hover:bg-pink-500/20 hover:text-pink-400"
                  >
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                )}
                {vendor.facebook && (
                  <a
                    href={vendor.facebook.startsWith('http') ? vendor.facebook : `https://facebook.com/${vendor.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-slate-400 transition-colors hover:bg-blue-500/20 hover:text-blue-400"
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                )}
                {vendor.tiktok && (
                  <a
                    href={`https://tiktok.com/@${vendor.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-slate-400 transition-colors hover:bg-slate-500/20 hover:text-white"
                  >
                    <TikTokIcon className="h-5 w-5" />
                  </a>
                )}
                {vendor.website && (
                  <a
                    href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-slate-400 transition-colors hover:bg-teal-500/20 hover:text-teal-400"
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
          <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">About</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{vendor.description}</p>
          </section>

          {/* Community Story */}
          {vendor.communityStory && (
            <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Our Story</h2>
              <p className="text-slate-300 whitespace-pre-wrap">{vendor.communityStory}</p>
            </section>
          )}

          {/* Products */}
          {products.length > 0 && (
            <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Products & Services</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}

          {/* Gallery */}
          {vendor.galleryImages && vendor.galleryImages.length > 0 && (
            <section className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-6">Gallery</h2>
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
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Contact</h3>
            <div className="space-y-3">
              {vendor.location && (
                <div className="flex items-start gap-3 text-slate-300">
                  <MapPinIcon className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>{vendor.location}</p>
                    <p className="text-sm text-slate-500">{vendor.region}</p>
                  </div>
                </div>
              )}
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-3 text-slate-300 hover:text-teal-400 transition-colors"
                >
                  <EnvelopeIcon className="h-5 w-5 text-slate-500" />
                  {vendor.email}
                </a>
              )}
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-3 text-slate-300 hover:text-teal-400 transition-colors"
                >
                  <PhoneIcon className="h-5 w-5 text-slate-500" />
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
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30"
              >
                <GlobeAltIcon className="h-5 w-5" />
                Visit Website
              </a>
            )}
          </div>

          {/* Shipping Info */}
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Shipping & Location</h3>
            <div className="space-y-3">
              {vendor.shipsCanadaWide && (
                <div className="flex items-center gap-3 text-teal-400">
                  <TruckIcon className="h-5 w-5" />
                  <span>Ships Canada-wide</span>
                </div>
              )}
              {vendor.onlineOnly ? (
                <div className="flex items-center gap-3 text-slate-400">
                  <GlobeAltIcon className="h-5 w-5" />
                  <span>Online only</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-slate-400">
                  <MapPinIcon className="h-5 w-5" />
                  <span>Physical location available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function ProductCard({ product }: { product: VendorProduct }) {
  return (
    <div className="group overflow-hidden rounded-xl bg-slate-700/50 border border-slate-600 transition-all hover:border-teal-500/50">
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
        <h4 className="font-semibold text-white">{product.name}</h4>
        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{product.description}</p>
        {(product.priceDisplay || product.price) && (
          <p className="mt-2 font-semibold text-teal-400">
            {product.priceDisplay || `$${(product.price! / 100).toFixed(2)}`}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          {product.madeToOrder && <span className="rounded bg-slate-600 px-2 py-0.5">Made to order</span>}
          {!product.inStock && <span className="rounded bg-amber-500/20 text-amber-400 px-2 py-0.5">Out of stock</span>}
        </div>
      </div>
    </div>
  );
}

export default VendorPage;

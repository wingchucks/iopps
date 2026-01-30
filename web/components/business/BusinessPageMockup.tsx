'use client';

/**
 * BusinessPageMockup.tsx
 *
 * A stunning visual prototype of the redesigned IOPPS Business page.
 * This mockup demonstrates the full vision: Indigenous Futurism meets
 * Apple-level polish with glassmorphism, animated gradients, and
 * premium micro-interactions.
 *
 * Design Tokens Used:
 * - Deep backgrounds: slate-950, slate-900
 * - Glass containers: backdrop-blur-xl, border-slate-700/50
 * - Primary gradient: teal-400 to cyan-400
 * - Warm accents: amber-400, orange-500
 * - Northern Lights: teal to purple gradients
 */

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  MapPinIcon,
  StarIcon,
  ArrowRightIcon,
  SparklesIcon,
  TrophyIcon,
  ChartBarIcon,
  EyeIcon,
  HeartIcon,
  BuildingStorefrontIcon,
  PlusIcon,
  PencilSquareIcon,
  ChevronRightIcon,
  UsersIcon,
  FireIcon,
} from '@heroicons/react/24/solid';
import {
  GlobeAltIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_STATS = {
  businesses: 847,
  services: 234,
  grants: 56,
  totalValue: 2400000,
};

const MOCK_FEATURED_BUSINESS = {
  id: 'spotlight-1',
  businessName: 'Northern Star Designs',
  tagline: 'Handcrafted Indigenous jewelry celebrating ancestral traditions',
  description: 'Award-winning Indigenous jewelry studio creating contemporary pieces inspired by traditional Anishinaabe designs. Each piece tells a story of resilience and cultural pride.',
  coverImageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80',
  logoUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&q=80',
  category: 'Jewelry & Accessories',
  nation: 'Anishinaabe Nation',
  location: 'Thunder Bay, ON',
  verified: true,
  slug: 'northern-star-designs',
  stats: {
    rating: 4.9,
    reviews: 127,
    followers: 2340,
    products: 48,
  },
};

const MOCK_VENDORS = [
  {
    id: 'v1',
    businessName: 'Cedar & Sage',
    tagline: 'Natural wellness products',
    coverImageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80',
    logoUrl: null,
    category: 'Health & Wellness',
    nation: 'Cree Nation',
    location: 'Edmonton, AB',
    verified: true,
    rating: 4.8,
  },
  {
    id: 'v2',
    businessName: 'Thunderbird Arts',
    tagline: 'Contemporary Indigenous art',
    coverImageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80',
    logoUrl: null,
    category: 'Art & Prints',
    nation: 'Haida Nation',
    location: 'Vancouver, BC',
    verified: true,
    rating: 5.0,
  },
  {
    id: 'v3',
    businessName: 'Moccasin Trail',
    tagline: 'Traditional footwear reimagined',
    coverImageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
    logoUrl: null,
    category: 'Footwear',
    nation: 'Ojibwe Nation',
    location: 'Winnipeg, MB',
    verified: false,
    rating: 4.7,
  },
  {
    id: 'v4',
    businessName: 'Spirit Bear Coffee',
    tagline: 'Ethically sourced, Indigenous owned',
    coverImageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    logoUrl: null,
    category: 'Food & Beverage',
    nation: "Gitga'at Nation",
    location: 'Prince Rupert, BC',
    verified: true,
    rating: 4.9,
  },
  {
    id: 'v5',
    businessName: 'Birch & Bone',
    tagline: 'Handcrafted leather goods',
    coverImageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
    logoUrl: null,
    category: 'Leather Goods',
    nation: 'Blackfoot Confederacy',
    location: 'Calgary, AB',
    verified: true,
    rating: 4.8,
  },
];

const MOCK_CATEGORIES = [
  { id: 'jewelry', label: 'Jewelry', icon: '💎', gradient: 'from-cyan-500 to-blue-600', count: 124 },
  { id: 'art', label: 'Art & Prints', icon: '🎨', gradient: 'from-pink-500 to-rose-600', count: 89 },
  { id: 'apparel', label: 'Apparel', icon: '👕', gradient: 'from-emerald-500 to-teal-600', count: 156 },
  { id: 'food', label: 'Food & Beverage', icon: '🍞', gradient: 'from-amber-500 to-orange-600', count: 67 },
  { id: 'wellness', label: 'Health & Wellness', icon: '🌿', gradient: 'from-green-500 to-emerald-600', count: 45 },
  { id: 'crafts', label: 'Crafts', icon: '🪶', gradient: 'from-purple-500 to-violet-600', count: 98 },
  { id: 'home', label: 'Home & Decor', icon: '🏠', gradient: 'from-indigo-500 to-blue-600', count: 73 },
  { id: 'services', label: 'Services', icon: '💼', gradient: 'from-slate-500 to-slate-600', count: 234 },
  { id: 'tech', label: 'Technology', icon: '💻', gradient: 'from-violet-500 to-purple-600', count: 31 },
  { id: 'media', label: 'Media & Content', icon: '📱', gradient: 'from-rose-500 to-pink-600', count: 52 },
];

const MOCK_VERIFIED_LOGOS = [
  { id: 'vl1', name: 'Northern Star', initial: 'NS', color: 'from-teal-400 to-cyan-500' },
  { id: 'vl2', name: 'Cedar Sage', initial: 'CS', color: 'from-emerald-400 to-green-500' },
  { id: 'vl3', name: 'Thunderbird', initial: 'TB', color: 'from-amber-400 to-orange-500' },
  { id: 'vl4', name: 'Spirit Bear', initial: 'SB', color: 'from-purple-400 to-violet-500' },
  { id: 'vl5', name: 'Birch Bone', initial: 'BB', color: 'from-rose-400 to-pink-500' },
  { id: 'vl6', name: 'Eagle Eye', initial: 'EE', color: 'from-blue-400 to-indigo-500' },
  { id: 'vl7', name: 'River Stone', initial: 'RS', color: 'from-cyan-400 to-teal-500' },
  { id: 'vl8', name: 'Wolf Pack', initial: 'WP', color: 'from-slate-400 to-slate-500' },
];

const MOCK_LEADERBOARD = [
  { id: 'l1', name: 'Northern Star Designs', category: 'Jewelry', growth: '+847%', followers: 2340, rank: 1 },
  { id: 'l2', name: 'Thunderbird Arts', category: 'Art & Prints', growth: '+623%', followers: 1890, rank: 2 },
  { id: 'l3', name: 'Cedar & Sage Wellness', category: 'Health', growth: '+412%', followers: 1560, rank: 3 },
  { id: 'l4', name: 'Moccasin Trail Co.', category: 'Footwear', growth: '+389%', followers: 1240, rank: 4 },
  { id: 'l5', name: 'Spirit Bear Coffee', category: 'Food', growth: '+356%', followers: 1120, rank: 5 },
];

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
  },
};

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  },
};

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
  },
};

const slideInFromLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
  },
};

const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 20px -5px rgba(20, 184, 166, 0.3)',
      '0 0 40px -5px rgba(20, 184, 166, 0.5)',
      '0 0 20px -5px rgba(20, 184, 166, 0.3)',
    ],
  },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
};

// ============================================================================
// ANIMATED COUNTER COMPONENT
// ============================================================================

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

function AnimatedCounter({ end, duration = 2, prefix = '', suffix = '' }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, isInView]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection() {
  const [activeTab, setActiveTab] = useState<'shop' | 'services' | 'grants'>('shop');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'shop' as const, label: 'Shop', icon: ShoppingBagIcon, count: MOCK_STATS.businesses },
    { id: 'services' as const, label: 'Services', icon: WrenchScrewdriverIcon, count: MOCK_STATS.services },
    { id: 'grants' as const, label: 'Grants', icon: BanknotesIcon, count: MOCK_STATS.grants },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Animated Ocean Wave Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/30" />

      {/* Animated Northern Lights Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/4 h-[200%] w-[150%] bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-purple-500/10 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/4 h-[200%] w-[150%] bg-gradient-to-l from-purple-500/10 via-teal-500/5 to-cyan-500/10 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            rotate: [0, -5, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:py-24">
        {/* Eyebrow with animated badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <motion.span
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/30 px-4 py-1.5 text-sm font-semibold text-teal-300 backdrop-blur-sm"
            animate={{ boxShadow: ['0 0 20px rgba(20, 184, 166, 0.2)', '0 0 30px rgba(20, 184, 166, 0.4)', '0 0 20px rgba(20, 184, 166, 0.2)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <SparklesIcon className="h-4 w-4" />
            Indigenous Marketplace
          </motion.span>
        </motion.div>

        {/* Title with gradient text */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4"
        >
          Support{' '}
          <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Indigenous
          </span>
          <br />
          Businesses
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-8"
        >
          Discover authentic Indigenous-owned businesses, artisans, and service providers across Turtle Island.
        </motion.p>

        {/* Animated Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap gap-6 sm:gap-10 mb-10"
        >
          {[
            { label: 'Businesses', value: MOCK_STATS.businesses, suffix: '+' },
            { label: 'Services', value: MOCK_STATS.services, suffix: '+' },
            { label: 'In Grants', value: MOCK_STATS.totalValue / 1000000, prefix: '$', suffix: 'M+' },
          ].map((stat, i) => (
            <div key={stat.label} className="text-center sm:text-left">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                <AnimatedCounter
                  end={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  duration={2 + i * 0.3}
                />
              </div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Enhanced Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap gap-3 mb-8"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-lg shadow-white/20'
                    : 'bg-slate-800/60 text-slate-300 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600/50'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                {tab.label}
                <span className={`ml-1 text-xs ${isActive ? 'text-slate-500' : 'text-slate-500'}`}>
                  ({tab.count})
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 rounded-2xl bg-white"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Search Bar with Glow */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative max-w-2xl"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/30 via-cyan-500/30 to-teal-500/30 rounded-2xl blur-lg opacity-60" />
          <div className="relative flex items-center">
            <MagnifyingGlassIcon className="absolute left-5 h-5 w-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search businesses, products, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 py-4 pl-14 pr-32 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
            />
            <button className="absolute right-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] transition-all">
              Search
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// BUSINESS SPOTLIGHT SECTION
// ============================================================================

function BusinessSpotlight() {
  const business = MOCK_FEATURED_BUSINESS;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative py-12 sm:py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="flex items-center gap-3 mb-8"
        >
          <motion.div
            className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-4 py-2"
            animate={{ boxShadow: ['0 0 15px rgba(245, 158, 11, 0.2)', '0 0 25px rgba(245, 158, 11, 0.4)', '0 0 15px rgba(245, 158, 11, 0.2)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <StarIcon className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">Business Spotlight</span>
          </motion.div>
          <span className="text-sm text-slate-500">Featured Today</span>
        </motion.div>

        {/* Spotlight Card */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={scaleInVariants}
          className="group relative overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl shadow-2xl shadow-black/20"
        >
          {/* Cover Image Container */}
          <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
            <Image
              src={business.coverImageUrl}
              alt={business.businessName}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent" />

            {/* Featured Badge with Pulse Glow */}
            <motion.div
              className="absolute top-6 right-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(245, 158, 11, 0.4)',
                  '0 0 35px rgba(245, 158, 11, 0.6)',
                  '0 0 20px rgba(245, 158, 11, 0.4)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <SparklesIcon className="h-4 w-4" />
              Featured
            </motion.div>

            {/* Logo with Glow Effect */}
            <div className="absolute -bottom-10 left-8 sm:left-12">
              <motion.div
                className="relative h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-2xl border-4 border-slate-900 bg-slate-800 shadow-2xl"
                whileHover={{ scale: 1.05, rotate: 2 }}
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(20, 184, 166, 0.3)',
                    '0 0 50px rgba(20, 184, 166, 0.5)',
                    '0 0 30px rgba(20, 184, 166, 0.3)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {business.logoUrl ? (
                  <Image
                    src={business.logoUrl}
                    alt={`${business.businessName} logo`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 to-cyan-600 text-3xl sm:text-4xl font-bold text-white">
                    {business.businessName.charAt(0)}
                  </div>
                )}

                {/* Verified Badge */}
                {business.verified && (
                  <div className="absolute -bottom-2 -right-2 rounded-full bg-slate-900 p-1">
                    <CheckBadgeIcon className="h-6 w-6 text-teal-400" />
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Content */}
          <div className="relative p-8 pt-16 sm:p-12 sm:pt-16">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              {/* Left Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                    {business.businessName}
                  </h2>
                  <CheckBadgeIcon className="h-7 w-7 text-teal-400" />
                </div>

                <p className="text-lg text-slate-300 mb-4 max-w-2xl">
                  {business.tagline}
                </p>

                <p className="text-slate-400 mb-6 max-w-2xl line-clamp-2">
                  {business.description}
                </p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-sm font-medium text-teal-400">
                    {business.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-400">
                    <MapPinIcon className="h-4 w-4" />
                    {business.location}
                  </span>
                  <span className="text-sm text-slate-500 italic">
                    {business.nation}
                  </span>
                </div>

                {/* Quick Stats Row */}
                <div className="flex flex-wrap gap-6">
                  {[
                    { icon: StarIcon, value: business.stats.rating, label: 'Rating', color: 'text-amber-400' },
                    { icon: HeartIcon, value: business.stats.followers.toLocaleString(), label: 'Followers', color: 'text-rose-400' },
                    { icon: ShoppingBagIcon, value: business.stats.products, label: 'Products', color: 'text-teal-400' },
                    { icon: EyeIcon, value: business.stats.reviews, label: 'Reviews', color: 'text-purple-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-2">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      <span className="font-semibold text-white">{stat.value}</span>
                      <span className="text-sm text-slate-500">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dual CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-8 py-4 font-semibold text-white shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all"
                >
                  <BuildingStorefrontIcon className="h-5 w-5" />
                  Visit Shop
                  <ArrowRightIcon className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800/60 border border-slate-600/50 px-8 py-4 font-semibold text-slate-200 hover:bg-slate-700/60 hover:border-slate-500/50 transition-all"
                >
                  <HeartIcon className="h-5 w-5" />
                  Follow
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURED VENDORS CAROUSEL
// ============================================================================

function FeaturedVendorsCarousel() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate vendors for seamless loop
  const duplicatedVendors = [...MOCK_VENDORS, ...MOCK_VENDORS];

  return (
    <section ref={ref} className="relative py-12 sm:py-16 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mb-8">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Featured Vendors</h2>
            <p className="text-slate-400">Handpicked businesses making waves in our community</p>
          </div>
          <Link
            href="/business/directory"
            className="hidden sm:flex items-center gap-2 text-teal-400 font-semibold hover:text-teal-300 transition-colors"
          >
            View All
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>

      {/* Carousel Container with Edge Masks */}
      <div className="relative">
        {/* Left Edge Mask */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />

        {/* Right Edge Mask */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

        {/* Scrolling Container */}
        <motion.div
          className="flex gap-6"
          animate={isPaused ? {} : { x: [0, -1920] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {duplicatedVendors.map((vendor, index) => (
            <motion.div
              key={`${vendor.id}-${index}`}
              whileHover={{ scale: 1.03, y: -5 }}
              className="flex-shrink-0 w-72"
            >
              <div className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-teal-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/10">
                {/* Cover Image */}
                <div className="relative h-40 overflow-hidden">
                  {vendor.coverImageUrl ? (
                    <Image
                      src={vendor.coverImageUrl}
                      alt={vendor.businessName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-purple-600/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                  {/* Verified Badge */}
                  {vendor.verified && (
                    <div className="absolute top-3 right-3 rounded-full bg-teal-500/20 backdrop-blur-sm p-1.5">
                      <CheckBadgeIcon className="h-4 w-4 text-teal-400" />
                    </div>
                  )}

                  {/* Logo */}
                  <div className="absolute -bottom-5 left-4">
                    <div className="h-12 w-12 overflow-hidden rounded-xl border-2 border-slate-900 bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                      {vendor.businessName.charAt(0)}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 pt-7">
                  <h3 className="font-semibold text-white group-hover:text-teal-400 transition-colors line-clamp-1">
                    {vendor.businessName}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-1 mt-1">{vendor.tagline}</p>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">{vendor.category}</span>
                    <div className="flex items-center gap-1">
                      <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-sm font-medium text-white">{vendor.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// ENHANCED CATEGORIES SECTION
// ============================================================================

function EnhancedCategories() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-12 sm:py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Browse Categories</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Explore our curated collection of Indigenous businesses across diverse industries
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainerVariants}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {MOCK_CATEGORIES.map((category) => (
            <motion.div
              key={category.id}
              variants={fadeUpVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="group relative cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 transition-all duration-300 group-hover:border-slate-600/50 group-hover:shadow-2xl group-hover:shadow-teal-500/10">
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                {/* Icon */}
                <div className={`relative h-14 w-14 mx-auto rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-2xl mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                  {category.icon}
                </div>

                {/* Label */}
                <h3 className="relative text-center font-semibold text-white group-hover:text-teal-400 transition-colors">
                  {category.label}
                </h3>

                {/* Count - appears on hover */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="text-center mt-2"
                >
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                    {category.count} businesses
                  </span>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// VERIFIED VENDORS BANNER
// ============================================================================

function VerifiedVendorsBanner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Duplicate for seamless loop
  const duplicatedLogos = [...MOCK_VERIFIED_LOGOS, ...MOCK_VERIFIED_LOGOS, ...MOCK_VERIFIED_LOGOS];

  return (
    <section ref={ref} className="relative py-10 overflow-hidden">
      {/* Gradient Background Band */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-900/30 via-cyan-900/20 to-teal-900/30" />

      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={fadeUpVariants}
        className="relative mx-auto max-w-7xl px-4 sm:px-6 mb-6"
      >
        <div className="flex items-center justify-center gap-3 text-center">
          <CheckBadgeIcon className="h-6 w-6 text-teal-400" />
          <h3 className="text-lg font-semibold text-white">Verified Indigenous-Owned Businesses</h3>
        </div>
        <p className="text-center text-sm text-slate-400 mt-2">
          Trusted vendors verified by IOPPS for authentic Indigenous ownership
        </p>
      </motion.div>

      {/* Auto-scrolling Logos */}
      <div className="relative">
        <motion.div
          className="flex items-center gap-8"
          animate={{ x: [0, -768] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`${logo.id}-${index}`}
              className="flex-shrink-0 flex items-center gap-3 rounded-full bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 px-4 py-2"
            >
              <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${logo.color} flex items-center justify-center text-sm font-bold text-white`}>
                {logo.initial}
              </div>
              <span className="text-sm font-medium text-slate-300 whitespace-nowrap">{logo.name}</span>
              <CheckBadgeIcon className="h-4 w-4 text-teal-400" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// VENDOR LEADERBOARD
// ============================================================================

function VendorLeaderboard() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophyIcon className="h-6 w-6 text-amber-400" />;
      case 2:
        return <TrophyIcon className="h-5 w-5 text-slate-300" />;
      case 3:
        return <TrophyIcon className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-slate-500">#{rank}</span>;
    }
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30';
      case 2:
        return 'bg-gradient-to-r from-slate-400/20 to-slate-500/20 border-slate-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30';
      default:
        return 'bg-slate-800/50 border-slate-700/50';
    }
  };

  return (
    <section ref={ref} className="py-12 sm:py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="flex items-center gap-3 mb-8"
        >
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/30 px-4 py-2">
            <FireIcon className="h-5 w-5 text-orange-400" />
            <span className="text-sm font-bold text-orange-400">Trending This Month</span>
          </div>
        </motion.div>

        {/* Leaderboard Glass Card */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={scaleInVariants}
          className="relative overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl shadow-2xl shadow-black/20"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-6 w-6 text-teal-400" />
              Fastest Growing Businesses
            </h2>
          </div>

          {/* Leaderboard List */}
          <div className="divide-y divide-slate-700/30">
            {MOCK_LEADERBOARD.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                whileHover={{ backgroundColor: 'rgba(20, 184, 166, 0.05)' }}
                className="flex items-center gap-4 p-5 cursor-pointer transition-colors"
              >
                {/* Rank Badge */}
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${getRankBadgeStyle(business.rank)}`}>
                  {getRankIcon(business.rank)}
                </div>

                {/* Business Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{business.name}</h3>
                  <p className="text-sm text-slate-400">{business.category}</p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">{business.growth}</div>
                    <div className="text-xs text-slate-500">Growth</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">{business.followers.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Followers</div>
                  </div>
                </div>

                <ChevronRightIcon className="h-5 w-5 text-slate-600" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// FOR VENDORS SECTION (Business Preview)
// ============================================================================

function ForVendorsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-12 sm:py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="flex items-center gap-3 mb-8"
        >
          <div className="flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/30 px-4 py-2">
            <BuildingStorefrontIcon className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-bold text-purple-400">For Vendors</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Business Preview Card */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={slideInFromLeft}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-8"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-3xl" />

            <h3 className="text-xl font-bold text-white mb-2">Your Business Preview</h3>
            <p className="text-slate-400 mb-6">See how your business would appear in the marketplace</p>

            {/* Mock Business Card Preview */}
            <div className="relative rounded-2xl bg-slate-900/80 border border-slate-700/50 overflow-hidden mb-6">
              <div className="h-32 bg-gradient-to-br from-purple-600/20 to-teal-600/20" />
              <div className="p-4 pt-10 relative">
                <div className="absolute -top-8 left-4 h-16 w-16 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white border-4 border-slate-900">
                  YB
                </div>
                <h4 className="font-semibold text-white">Your Business Name</h4>
                <p className="text-sm text-slate-400">Your amazing tagline here</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs rounded-full bg-purple-500/10 text-purple-400 px-2 py-0.5">Your Category</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Profile Views', value: '0', icon: EyeIcon },
                { label: 'Inquiries', value: '0', icon: UsersIcon },
                { label: 'Followers', value: '0', icon: HeartIcon },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <stat.icon className="h-5 w-5 text-slate-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
              >
                <PlusIcon className="h-5 w-5" />
                Create Listing
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800/60 border border-slate-600/50 px-6 py-3 font-semibold text-slate-200 hover:bg-slate-700/60 transition-all"
              >
                <PencilSquareIcon className="h-5 w-5" />
                Edit Profile
              </motion.button>
            </div>
          </motion.div>

          {/* Benefits List */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="flex flex-col justify-center"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Why list your business?</h3>

            <div className="space-y-4">
              {[
                { icon: GlobeAltIcon, title: 'Reach Thousands', description: 'Connect with customers actively seeking Indigenous-owned businesses' },
                { icon: CheckBadgeIcon, title: 'Get Verified', description: 'Build trust with our Indigenous-ownership verification badge' },
                { icon: ChartBarIcon, title: 'Track Analytics', description: 'Monitor views, inquiries, and engagement with detailed insights' },
                { icon: UsersIcon, title: 'Join the Community', description: 'Network with fellow Indigenous entrepreneurs and mentors' },
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <benefit.icon className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{benefit.title}</h4>
                    <p className="text-sm text-slate-400">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// DUAL CTA SECTION
// ============================================================================

function DualCTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Customer CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40, x: -20 }}
            animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl"
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700" />

            {/* Decorative Elements */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl" />

            <div className="relative p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white mb-6">
                <ShoppingBagIcon className="h-4 w-4" />
                For Shoppers
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Shop with Purpose
              </h3>
              <p className="text-white/80 mb-8 max-w-md">
                Every purchase supports Indigenous families, communities, and the preservation of traditional arts and practices.
              </p>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-teal-700 shadow-lg shadow-black/20 hover:shadow-xl transition-all"
              >
                Start Shopping
                <ArrowRightIcon className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>

          {/* Vendor CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40, x: 20 }}
            animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl"
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700" />

            {/* Decorative Elements */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-violet-400/20 rounded-full blur-2xl" />

            <div className="relative p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white mb-6">
                <BuildingStorefrontIcon className="h-4 w-4" />
                For Vendors
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Grow Your Business
              </h3>
              <p className="text-white/80 mb-8 max-w-md">
                Join hundreds of Indigenous entrepreneurs reaching new customers and building their brands on IOPPS.
              </p>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-purple-700 shadow-lg shadow-black/20 hover:shadow-xl transition-all"
              >
                List Your Business
                <ArrowRightIcon className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN MOCKUP COMPONENT
// ============================================================================

export default function BusinessPageMockup() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero with Ocean Wave Gradient & Stats */}
      <HeroSection />

      {/* Business Spotlight - Full Width Featured Card */}
      <BusinessSpotlight />

      {/* Featured Vendors - Auto-scrolling Carousel */}
      <FeaturedVendorsCarousel />

      {/* Enhanced Categories - 10 Categories with Unique Gradients */}
      <EnhancedCategories />

      {/* Verified Vendors Banner - Trust Strip */}
      <VerifiedVendorsBanner />

      {/* Vendor Leaderboard - Trending This Month */}
      <VendorLeaderboard />

      {/* For Vendors Section - Business Preview */}
      <ForVendorsSection />

      {/* Dual CTA - Customer vs Vendor */}
      <DualCTASection />
    </div>
  );
}

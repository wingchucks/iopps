'use client';

import { VENDOR_CATEGORIES, type VendorCategory } from '@/lib/types';

interface CategoryFilterProps {
  selected: VendorCategory | null;
  onChange: (category: VendorCategory | null) => void;
}

const categoryIcons: Record<string, string> = {
  'Art & Crafts': '🎨',
  'Jewelry & Accessories': '💎',
  'Clothing & Apparel': '👕',
  'Food & Beverages': '🍯',
  'Health & Wellness': '🌿',
  'Home & Living': '🏠',
  'Books & Media': '📚',
  'Services': '🛠️',
  'Other': '✨',
};

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
          selected === null
            ? 'bg-accent text-white shadow-lg shadow-teal-500/25'
            : 'bg-surface text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white'
        }`}
      >
        All
      </button>
      {VENDOR_CATEGORIES.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            selected === category
              ? 'bg-accent text-white shadow-lg shadow-teal-500/25'
              : 'bg-surface text-[var(--text-secondary)] hover:bg-slate-700 hover:text-white'
          }`}
        >
          <span className="mr-1.5">{categoryIcons[category]}</span>
          {category}
        </button>
      ))}
    </div>
  );
}

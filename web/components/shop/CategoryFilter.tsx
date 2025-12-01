"use client";

import { useState } from "react";
import type { CategoryWithChildren } from "@/lib/firebase/categories";
import type { Nation, NationsByRegion } from "@/lib/firebase/nations";

interface CategoryFilterProps {
  categories?: CategoryWithChildren[];
  nations?: NationsByRegion[];
  activeFilters: {
    subcategory?: string;
    nations?: string[];
    regions?: string[];
    materials?: string[];
    techniques?: string[];
    priceRange?: string;
    customOrdersOnly?: boolean;
  };
  onFilterChange: (filters: CategoryFilterProps["activeFilters"]) => void;
  materialOptions?: string[];
  techniqueOptions?: string[];
}

export function CategoryFilter({
  categories,
  nations,
  activeFilters,
  onFilterChange,
  materialOptions = [],
  techniqueOptions = [],
}: CategoryFilterProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["subcategory", "nation", "priceRange"])
  );
  const [nationSearch, setNationSearch] = useState("");

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    onFilterChange({
      ...activeFilters,
      subcategory:
        activeFilters.subcategory === subcategoryId ? undefined : subcategoryId,
    });
  };

  const handleNationToggle = (nationId: string) => {
    const currentNations = activeFilters.nations || [];
    const newNations = currentNations.includes(nationId)
      ? currentNations.filter((n) => n !== nationId)
      : [...currentNations, nationId];
    onFilterChange({
      ...activeFilters,
      nations: newNations.length > 0 ? newNations : undefined,
    });
  };

  const handleRegionToggle = (region: string) => {
    const currentRegions = activeFilters.regions || [];
    const newRegions = currentRegions.includes(region)
      ? currentRegions.filter((r) => r !== region)
      : [...currentRegions, region];
    onFilterChange({
      ...activeFilters,
      regions: newRegions.length > 0 ? newRegions : undefined,
    });
  };

  const handleMaterialToggle = (material: string) => {
    const currentMaterials = activeFilters.materials || [];
    const newMaterials = currentMaterials.includes(material)
      ? currentMaterials.filter((m) => m !== material)
      : [...currentMaterials, material];
    onFilterChange({
      ...activeFilters,
      materials: newMaterials.length > 0 ? newMaterials : undefined,
    });
  };

  const handleTechniqueToggle = (technique: string) => {
    const currentTechniques = activeFilters.techniques || [];
    const newTechniques = currentTechniques.includes(technique)
      ? currentTechniques.filter((t) => t !== technique)
      : [...currentTechniques, technique];
    onFilterChange({
      ...activeFilters,
      techniques: newTechniques.length > 0 ? newTechniques : undefined,
    });
  };

  const handlePriceRangeChange = (range: string) => {
    onFilterChange({
      ...activeFilters,
      priceRange: activeFilters.priceRange === range ? undefined : range,
    });
  };

  const handleCustomOrdersToggle = () => {
    onFilterChange({
      ...activeFilters,
      customOrdersOnly: !activeFilters.customOrdersOnly,
    });
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  // Count active filters
  const activeFilterCount =
    (activeFilters.subcategory ? 1 : 0) +
    (activeFilters.nations?.length || 0) +
    (activeFilters.regions?.length || 0) +
    (activeFilters.materials?.length || 0) +
    (activeFilters.techniques?.length || 0) +
    (activeFilters.priceRange ? 1 : 0) +
    (activeFilters.customOrdersOnly ? 1 : 0);

  // Filter nations by search
  const filteredNations = nations
    ?.map((group) => ({
      ...group,
      nations: group.nations.filter(
        (n) =>
          n.name.toLowerCase().includes(nationSearch.toLowerCase()) ||
          n.alternateNames.some((alt) =>
            alt.toLowerCase().includes(nationSearch.toLowerCase())
          )
      ),
    }))
    .filter((group) => group.nations.length > 0);

  return (
    <div className="space-y-6">
      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">
            {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}{" "}
            active
          </span>
          <button
            onClick={clearAllFilters}
            className="text-sm font-medium text-[#14B8A6] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Subcategory Filter */}
      {categories && categories.length > 0 && categories[0].subcategories.length > 0 && (
        <FilterSection
          title="Subcategory"
          isExpanded={expandedSections.has("subcategory")}
          onToggle={() => toggleSection("subcategory")}
        >
          <div className="space-y-2">
            {categories[0].subcategories.map((sub) => (
              <label
                key={sub.id}
                className="flex cursor-pointer items-center gap-3 text-sm text-slate-300 hover:text-slate-100"
              >
                <input
                  type="radio"
                  name="subcategory"
                  checked={activeFilters.subcategory === sub.id}
                  onChange={() => handleSubcategoryChange(sub.id)}
                  className="h-4 w-4 border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
                />
                <span className="flex-1">{sub.name}</span>
                {sub.vendorCount > 0 && (
                  <span className="text-xs text-slate-500">
                    {sub.vendorCount}
                  </span>
                )}
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Nation/Tribe Filter */}
      {nations && nations.length > 0 && (
        <FilterSection
          title="Nation / Tribe"
          isExpanded={expandedSections.has("nation")}
          onToggle={() => toggleSection("nation")}
        >
          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              value={nationSearch}
              onChange={(e) => setNationSearch(e.target.value)}
              placeholder="Search nations..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
            />
          </div>

          {/* Nation List */}
          <div className="max-h-60 space-y-4 overflow-y-auto">
            {filteredNations?.map((group) => (
              <div key={group.region}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group.region}
                </p>
                <div className="space-y-1">
                  {group.nations.map((nation) => (
                    <label
                      key={nation.id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={activeFilters.nations?.includes(nation.id)}
                        onChange={() => handleNationToggle(nation.id)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
                      />
                      <span className="flex-1">{nation.name}</span>
                      {nation.vendorCount > 0 && (
                        <span className="text-xs text-slate-500">
                          {nation.vendorCount}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Intertribal Option */}
          <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-slate-800 pt-3 text-sm text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={activeFilters.nations?.includes("intertribal")}
              onChange={() => handleNationToggle("intertribal")}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
            />
            <span>Intertribal</span>
          </label>
        </FilterSection>
      )}

      {/* Region Filter */}
      <FilterSection
        title="Region"
        isExpanded={expandedSections.has("region")}
        onToggle={() => toggleSection("region")}
      >
        <div className="space-y-2">
          {[
            "Pacific Northwest",
            "Southwest",
            "Plains",
            "Great Lakes",
            "Southeast",
            "Northeast",
            "Alaska",
            "Canada",
          ].map((region) => (
            <label
              key={region}
              className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
            >
              <input
                type="checkbox"
                checked={activeFilters.regions?.includes(region)}
                onChange={() => handleRegionToggle(region)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
              />
              <span>{region}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Materials Filter */}
      {materialOptions.length > 0 && (
        <FilterSection
          title="Materials"
          isExpanded={expandedSections.has("materials")}
          onToggle={() => toggleSection("materials")}
        >
          <div className="space-y-2">
            {materialOptions.map((material) => (
              <label
                key={material}
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
              >
                <input
                  type="checkbox"
                  checked={activeFilters.materials?.includes(material)}
                  onChange={() => handleMaterialToggle(material)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
                />
                <span className="capitalize">{material}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Techniques Filter */}
      {techniqueOptions.length > 0 && (
        <FilterSection
          title="Techniques"
          isExpanded={expandedSections.has("techniques")}
          onToggle={() => toggleSection("techniques")}
        >
          <div className="space-y-2">
            {techniqueOptions.map((technique) => (
              <label
                key={technique}
                className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
              >
                <input
                  type="checkbox"
                  checked={activeFilters.techniques?.includes(technique)}
                  onChange={() => handleTechniqueToggle(technique)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
                />
                <span className="capitalize">{technique}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Price Range Filter */}
      <FilterSection
        title="Price Range"
        isExpanded={expandedSections.has("priceRange")}
        onToggle={() => toggleSection("priceRange")}
      >
        <div className="space-y-2">
          {[
            { value: "budget", label: "Budget ($)" },
            { value: "mid", label: "Mid-Range ($$)" },
            { value: "premium", label: "Premium ($$$)" },
            { value: "luxury", label: "Luxury ($$$$)" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
            >
              <input
                type="radio"
                name="priceRange"
                checked={activeFilters.priceRange === option.value}
                onChange={() => handlePriceRangeChange(option.value)}
                className="h-4 w-4 border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-slate-900"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Custom Orders Toggle */}
      <div className="border-t border-slate-800 pt-4">
        <label className="flex cursor-pointer items-center justify-between text-sm text-slate-300">
          <span>Custom Orders Available</span>
          <button
            onClick={handleCustomOrdersToggle}
            className={`relative h-6 w-11 rounded-full transition ${
              activeFilters.customOrdersOnly
                ? "bg-[#14B8A6]"
                : "bg-slate-700"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${
                activeFilters.customOrdersOnly ? "translate-x-5" : ""
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}

/**
 * Collapsible filter section
 */
function FilterSection({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-800 pb-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-slate-200"
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && <div className="mt-2">{children}</div>}
    </div>
  );
}

/**
 * Mobile filter drawer
 */
interface MobileFilterDrawerProps extends CategoryFilterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  ...filterProps
}: MobileFilterDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[#08090C] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Filters</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <CategoryFilter {...filterProps} />

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full bg-[#14B8A6] py-3 text-sm font-semibold text-slate-900 transition hover:bg-[#14B8A6]/90"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
}

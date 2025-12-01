"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createVendor, type VendorInput, type PriceRange } from "@/lib/firebase/vendors";
import { getNations, type NationsByRegion } from "@/lib/firebase/nations";
import { getCategories, type CategoryWithChildren } from "@/lib/firebase/categories";
import { useEffect } from "react";

type Step = "basics" | "details" | "categories" | "contact" | "review";

export default function VendorSetupPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("basics");
  const [nationsByRegion, setNationsByRegion] = useState<NationsByRegion[]>([]);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    businessName: "",
    tagline: "",
    description: "",
    nationId: "",
    nationName: "",
    categoryIds: [] as string[],
    email: "",
    phone: "",
    website: "",
    city: "",
    province: "",
    country: "Canada",
    priceRange: "mid" as PriceRange,
    acceptsCustomOrders: false,
  });

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [nationsData, categoriesData] = await Promise.all([
          getNations(),
          getCategories(),
        ]);
        setNationsByRegion(nationsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Handle form changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;

      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));

      // If nation changes, also update nationName
      if (name === "nationId") {
        for (const region of nationsByRegion) {
          const nation = region.nations.find((n) => n.id === value);
          if (nation) {
            setFormData((prev) => ({ ...prev, nationName: nation.name }));
            break;
          }
        }
      }
    },
    [nationsByRegion]
  );

  // Handle category selection
  const handleCategoryChange = useCallback((categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  }, []);

  // Generate slug from business name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const vendorInput: VendorInput = {
        userId: user.uid,
        businessName: formData.businessName,
        slug: generateSlug(formData.businessName),
        tagline: formData.tagline,
        description: formData.description,
        nation: formData.nationName,
        nationId: formData.nationId,
        additionalNations: [],
        website: formData.website,
        email: formData.email || user.email || "",
        phone: formData.phone,
        profileImage: "",
        coverImage: "",
        gallery: [],
        videoUrl: "",
        categories: [],
        categoryIds: formData.categoryIds,
        materials: [],
        techniques: [],
        priceRange: formData.priceRange,
        acceptsCustomOrders: formData.acceptsCustomOrders,
        madeToOrder: false,
        location: {
          city: formData.city,
          province: formData.province,
          country: formData.country,
          region: formData.province,
        },
        socialLinks: {},
        status: "draft",
        featured: false,
      };

      await createVendor(vendorInput);

      // Redirect to dashboard
      router.push("/dashboard/vendor");
    } catch (err) {
      console.error("Error creating vendor:", err);
      setError("Failed to create your storefront. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation
  const steps: Step[] = ["basics", "details", "categories", "contact", "review"];
  const currentStepIndex = steps.indexOf(step);

  const canProceed = () => {
    switch (step) {
      case "basics":
        return formData.businessName.length >= 2 && formData.nationId;
      case "details":
        return formData.description.length >= 50;
      case "categories":
        return formData.categoryIds.length >= 1;
      case "contact":
        return true; // Optional
      case "review":
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setStep(steps[currentStepIndex + 1]);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D10] text-slate-400">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-[#14B8A6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4">Loading setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-100">
            Create Your Storefront
          </h1>
          <p className="mt-2 text-slate-400">
            Set up your Shop Indigenous vendor profile in a few simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    i < currentStepIndex
                      ? "bg-[#14B8A6] text-slate-900"
                      : i === currentStepIndex
                      ? "border-2 border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                      : "border border-slate-700 text-slate-500"
                  }`}
                >
                  {i < currentStepIndex ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-8 sm:w-16 ${
                      i < currentStepIndex ? "bg-[#14B8A6]" : "bg-slate-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Basics</span>
            <span>Details</span>
            <span>Categories</span>
            <span>Contact</span>
            <span>Review</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-[#08090C] p-6">
          {step === "basics" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Basic Information</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Tell us about your business
                </p>
              </div>

              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-slate-300">
                  Business Name *
                </label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Your business name"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                />
              </div>

              <div>
                <label htmlFor="tagline" className="block text-sm font-medium text-slate-300">
                  Tagline
                </label>
                <input
                  type="text"
                  id="tagline"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleChange}
                  placeholder="A short description (e.g., 'Handcrafted beadwork jewelry')"
                  maxLength={120}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                />
              </div>

              <div>
                <label htmlFor="nationId" className="block text-sm font-medium text-slate-300">
                  Nation / Tribe *
                </label>
                <select
                  id="nationId"
                  name="nationId"
                  value={formData.nationId}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                >
                  <option value="">Select your nation</option>
                  {nationsByRegion.map((group) => (
                    <optgroup key={group.region} label={group.region}>
                      {group.nations.map((nation) => (
                        <option key={nation.id} value={nation.id}>
                          {nation.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Your Story</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Tell visitors about your work and what makes it special
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-300">
                  Business Story *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Share your story. What inspires your work? How did you learn your craft? What makes your products unique?"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {formData.description.length} characters (minimum 50)
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="priceRange" className="block text-sm font-medium text-slate-300">
                    Price Range
                  </label>
                  <select
                    id="priceRange"
                    name="priceRange"
                    value={formData.priceRange}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                  >
                    <option value="budget">$ Budget-Friendly</option>
                    <option value="mid">$$ Mid-Range</option>
                    <option value="premium">$$$ Premium</option>
                    <option value="luxury">$$$$ Luxury</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="acceptsCustomOrders"
                      checked={formData.acceptsCustomOrders}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-[#14B8A6] focus:ring-[#14B8A6]"
                    />
                    <span className="text-sm text-slate-300">
                      I accept custom orders
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === "categories" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Categories</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select categories that best describe your products (select at least 1)
                </p>
              </div>

              <div className="space-y-6">
                {categories.map((category) => (
                  <div key={category.id}>
                    <p className="text-sm font-medium text-slate-300">{category.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {category.subcategories?.map((sub) => (
                        <label
                          key={sub.id}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${
                            formData.categoryIds.includes(sub.id)
                              ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]"
                              : "border-slate-700 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.categoryIds.includes(sub.id)}
                            onChange={() => handleCategoryChange(sub.id)}
                            className="sr-only"
                          />
                          {sub.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-slate-400">
                Selected: {formData.categoryIds.length} categor{formData.categoryIds.length === 1 ? "y" : "ies"}
              </p>
            </div>
          )}

          {step === "contact" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Contact & Location</h2>
                <p className="mt-1 text-sm text-slate-400">
                  How can customers reach you? (Optional - you can add these later)
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                    Business Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={user?.email || "email@example.com"}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-slate-300">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-slate-300">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                  />
                </div>
                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-slate-300">
                    Province / State
                  </label>
                  <input
                    type="text"
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-slate-300">
                    Country
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                  >
                    <option value="Canada">Canada</option>
                    <option value="United States">United States</option>
                    <option value="Mexico">Mexico</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Review Your Information</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Make sure everything looks good before creating your storefront
                </p>
              </div>

              <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Business Name</p>
                  <p className="mt-1 text-slate-200">{formData.businessName}</p>
                </div>
                {formData.tagline && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">Tagline</p>
                    <p className="mt-1 text-slate-200">{formData.tagline}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Nation</p>
                  <p className="mt-1 text-slate-200">{formData.nationName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Categories</p>
                  <p className="mt-1 text-slate-200">{formData.categoryIds.length} selected</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Price Range</p>
                  <p className="mt-1 text-slate-200">
                    {formData.priceRange === "budget" && "$ Budget-Friendly"}
                    {formData.priceRange === "mid" && "$$ Mid-Range"}
                    {formData.priceRange === "premium" && "$$$ Premium"}
                    {formData.priceRange === "luxury" && "$$$$ Luxury"}
                  </p>
                </div>
                {formData.acceptsCustomOrders && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">Custom Orders</p>
                    <p className="mt-1 text-slate-200">Yes, accepts custom orders</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="text-sm text-blue-300">
                  Your storefront will be created in draft mode. You can add images,
                  complete your profile, and publish when you&apos;re ready.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          {step === "review" ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-[#14B8A6] px-8 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488] disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Storefront"}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="rounded-lg bg-[#14B8A6] px-8 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getVendorByOwnerId,
  updateVendor,
  type Vendor,
  type VendorInput,
  type PriceRange,
} from "@/lib/firebase/vendors";
import { getCategories, type CategoryWithChildren } from "@/lib/firebase/categories";
import { getNations, type NationsByRegion } from "@/lib/firebase/nations";

export default function VendorProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [nationsByRegion, setNationsByRegion] = useState<NationsByRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    businessName: "",
    tagline: "",
    description: "",
    nation: "",
    nationId: "",
    website: "",
    email: "",
    phone: "",
    city: "",
    province: "",
    country: "",
    priceRange: "mid" as PriceRange,
    acceptsCustomOrders: false,
    madeToOrder: false,
    materials: [] as string[],
    techniques: [] as string[],
    categoryIds: [] as string[],
    instagram: "",
    facebook: "",
    pinterest: "",
    tiktok: "",
    youtube: "",
  });

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        const [vendorData, categoriesData, nationsData] = await Promise.all([
          getVendorByOwnerId(user.uid),
          getCategories(),
          getNations(),
        ]);

        setVendor(vendorData);
        setCategories(categoriesData);
        setNationsByRegion(nationsData);

        if (vendorData) {
          setFormData({
            businessName: vendorData.businessName || "",
            tagline: vendorData.tagline || "",
            description: vendorData.description || "",
            nation: vendorData.nation || "",
            nationId: vendorData.nationId || "",
            website: vendorData.website || "",
            email: vendorData.email || "",
            phone: vendorData.phone || "",
            city: vendorData.location?.city || "",
            province: vendorData.location?.province || "",
            country: vendorData.location?.country || "Canada",
            priceRange: vendorData.priceRange || "mid",
            acceptsCustomOrders: vendorData.acceptsCustomOrders || false,
            madeToOrder: vendorData.madeToOrder || false,
            materials: vendorData.materials || [],
            techniques: vendorData.techniques || [],
            categoryIds: vendorData.categoryIds || [],
            instagram: vendorData.socialLinks?.instagram || "",
            facebook: vendorData.socialLinks?.facebook || "",
            pinterest: vendorData.socialLinks?.pinterest || "",
            tiktok: vendorData.socialLinks?.tiktok || "",
            youtube: vendorData.socialLinks?.youtube || "",
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Handle form changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;

      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    },
    []
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

  // Handle materials/techniques (comma-separated)
  const handleArrayChange = useCallback(
    (field: "materials" | "techniques", value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value.split(",").map((s) => s.trim()).filter(Boolean),
      }));
    },
    []
  );

  // Handle save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendor) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Find nation name from nationId
      let nationName = formData.nation;
      for (const region of nationsByRegion) {
        const nation = region.nations.find((n) => n.id === formData.nationId);
        if (nation) {
          nationName = nation.name;
          break;
        }
      }

      const updates: Partial<VendorInput> = {
        businessName: formData.businessName,
        tagline: formData.tagline,
        description: formData.description,
        nation: nationName,
        nationId: formData.nationId,
        website: formData.website,
        email: formData.email,
        phone: formData.phone,
        location: {
          city: formData.city,
          province: formData.province,
          country: formData.country,
          region: formData.province, // Simplified
        },
        priceRange: formData.priceRange,
        acceptsCustomOrders: formData.acceptsCustomOrders,
        madeToOrder: formData.madeToOrder,
        materials: formData.materials,
        techniques: formData.techniques,
        categoryIds: formData.categoryIds,
        socialLinks: {
          instagram: formData.instagram || undefined,
          facebook: formData.facebook || undefined,
          pinterest: formData.pinterest || undefined,
          tiktok: formData.tiktok || undefined,
          youtube: formData.youtube || undefined,
        },
      };

      await updateVendor(vendor.id, updates);

      setSaveMessage({ type: "success", text: "Profile saved successfully!" });

      // Refresh vendor data
      const updatedVendor = await getVendorByOwnerId(user!.uid);
      setVendor(updatedVendor);
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage({
        type: "error",
        text: "Failed to save profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!vendor) {
    return null;
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Edit Profile</h1>
        <p className="mt-1 text-slate-400">
          Update your business information and storefront details
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mt-6 rounded-lg border p-4 ${
            saveMessage.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="mt-8 space-y-8">
        {/* Basic Info */}
        <section className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Basic Information</h2>

          <div className="mt-6 space-y-4">
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
                required
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
                placeholder="A short description of what you do"
                maxLength={120}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
              <p className="mt-1 text-xs text-slate-500">
                {formData.tagline.length}/120 characters
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
                required
                rows={6}
                placeholder="Tell your story. What inspires your work? What makes your products special?"
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
                required
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              >
                <option value="">Select nation</option>
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
        </section>

        {/* Categories */}
        <section className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Categories</h2>
          <p className="mt-1 text-sm text-slate-400">
            Select the categories that best describe your products
          </p>

          <div className="mt-4 space-y-4">
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
        </section>

        {/* Products & Services */}
        <section className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Products & Services</h2>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="materials" className="block text-sm font-medium text-slate-300">
                Materials Used
              </label>
              <input
                type="text"
                id="materials"
                value={formData.materials.join(", ")}
                onChange={(e) => handleArrayChange("materials", e.target.value)}
                placeholder="e.g., beads, leather, silver, turquoise"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
              <p className="mt-1 text-xs text-slate-500">Separate with commas</p>
            </div>

            <div>
              <label htmlFor="techniques" className="block text-sm font-medium text-slate-300">
                Techniques
              </label>
              <input
                type="text"
                id="techniques"
                value={formData.techniques.join(", ")}
                onChange={(e) => handleArrayChange("techniques", e.target.value)}
                placeholder="e.g., hand-beaded, hand-woven, traditional"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
              <p className="mt-1 text-xs text-slate-500">Separate with commas</p>
            </div>

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

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="acceptsCustomOrders"
                  checked={formData.acceptsCustomOrders}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-[#14B8A6] focus:ring-[#14B8A6]"
                />
                <span className="text-sm text-slate-300">Accepts custom orders</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="madeToOrder"
                  checked={formData.madeToOrder}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-[#14B8A6] focus:ring-[#14B8A6]"
                />
                <span className="text-sm text-slate-300">Made to order</span>
              </label>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Contact Information</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="website" className="block text-sm font-medium text-slate-300">
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Location</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
        </section>

        {/* Social Links */}
        <section className="rounded-xl border border-slate-800 bg-[#08090C] p-6">
          <h2 className="text-lg font-semibold text-slate-100">Social Media</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-slate-300">
                Instagram
              </label>
              <input
                type="text"
                id="instagram"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                placeholder="@username"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
            </div>
            <div>
              <label htmlFor="facebook" className="block text-sm font-medium text-slate-300">
                Facebook
              </label>
              <input
                type="text"
                id="facebook"
                name="facebook"
                value={formData.facebook}
                onChange={handleChange}
                placeholder="Page URL or username"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
            </div>
            <div>
              <label htmlFor="pinterest" className="block text-sm font-medium text-slate-300">
                Pinterest
              </label>
              <input
                type="text"
                id="pinterest"
                name="pinterest"
                value={formData.pinterest}
                onChange={handleChange}
                placeholder="@username"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
            </div>
            <div>
              <label htmlFor="tiktok" className="block text-sm font-medium text-slate-300">
                TikTok
              </label>
              <input
                type="text"
                id="tiktok"
                name="tiktok"
                value={formData.tiktok}
                onChange={handleChange}
                placeholder="@username"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard/vendor")}
            className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[#14B8A6] px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488] disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

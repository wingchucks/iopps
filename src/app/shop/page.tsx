import { getShopDataServer } from "@/lib/firestore-server";
import ShopClient from "./ShopClient";
import type { ShopListing, ShopVendor } from "@/lib/firestore/shop";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Indigenous - Support Indigenous Businesses | IOPPS",
  description:
    "Support Indigenous-owned businesses across Saskatchewan. Browse products, services, and vendor profiles.",
};

export const revalidate = 120;

export default async function ShopPage() {
  const { listings, vendors } = await getShopDataServer();
  return (
    <ShopClient
      initialListings={listings as unknown as ShopListing[]}
      initialVendors={vendors as unknown as ShopVendor[]}
    />
  );
}

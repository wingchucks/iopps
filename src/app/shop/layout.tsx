import type { Metadata } from "next";
export const metadata: Metadata = { title: "Indigenous Marketplace", description: "Shop Indigenous-owned businesses and support Indigenous entrepreneurs. Browse products, art, and services from across Canada.", alternates: { canonical: "/shop" } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }

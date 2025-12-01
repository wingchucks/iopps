"use client";

import { useState } from "react";
import Image from "next/image";
import type { GalleryImage } from "@/lib/firebase/vendors";

interface VendorGalleryProps {
  images: GalleryImage[];
  businessName: string;
}

export function VendorGallery({ images, businessName }: VendorGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-3 text-sm text-slate-400">
          Gallery images coming soon
        </p>
        <p className="mt-1 text-xs text-slate-500">
          We recommend at least 3 images to showcase your work
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-800 transition hover:ring-2 hover:ring-[#14B8A6]"
          >
            <Image
              src={image.url}
              alt={image.caption || `${businessName} gallery image ${index + 1}`}
              fill
              className="object-cover transition group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />

            {/* Zoom Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
              <div className="rounded-full bg-black/60 p-2">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                  />
                </svg>
              </div>
            </div>

            {/* Caption */}
            {image.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-sm text-white">{image.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <svg
              className="h-6 w-6"
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

          {/* Previous Button */}
          {selectedIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex - 1);
              }}
              className="absolute left-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Next Button */}
          {selectedIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex + 1);
              }}
              className="absolute right-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-h-[85vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[selectedIndex].url}
              alt={
                images[selectedIndex].caption ||
                `${businessName} gallery image ${selectedIndex + 1}`
              }
              width={1200}
              height={800}
              className="max-h-[85vh] rounded-lg object-contain"
            />

            {/* Caption */}
            {images[selectedIndex].caption && (
              <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/60 p-4">
                <p className="text-center text-white">
                  {images[selectedIndex].caption}
                </p>
              </div>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
              {selectedIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function VendorGallerySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square animate-pulse rounded-xl bg-slate-800"
        />
      ))}
    </div>
  );
}

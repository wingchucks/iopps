"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import './map.css';
import Link from 'next/link';

// Fix for Leaflet default icon issues in Next.js
const setupLeafletIcon = () => {
    // @ts-ignore
    delete Icon.Default.prototype._getIconUrl;
    Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
};

export interface MapItem {
    id: string;
    title: string;
    organization: string;
    type: 'job' | 'event' | 'scholarship' | 'school' | 'training' | 'vendor'; // Added new types
    location: string;
    lat: number;
    lng: number;
    url: string;
}

interface MapClientProps {
    items: MapItem[];
}

export default function MapClient({ items }: MapClientProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        setupLeafletIcon();
    }, []);

    if (!isMounted) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-500">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
        );
    }

    // Default center (Canada-ish)
    const center: [number, number] = [56.1304, -106.3468];

    return (
        <MapContainer
            center={center}
            zoom={4}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ background: '#0f172a' }} // Slate-900 background for loading
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {items.map((item) => (
                <Marker key={item.id} position={[item.lat, item.lng]}>
                    <Popup>
                        <div className="min-w-[200px]">
                            <h3 className="font-bold text-slate-900">{item.title}</h3>
                            <p className="text-sm text-slate-600">{item.organization}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.location}</p>
                            <div className="mt-2">
                                <Link
                                    href={item.url}
                                    className="inline-block rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                    View Details
                                </Link>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

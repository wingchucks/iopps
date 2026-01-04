"use client";

export default function MapPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center space-y-4">
            <div className="h-20 w-20 bg-slate-800 rounded-full flex items-center justify-center text-3xl">
                🗺️
            </div>
            <h1 className="text-2xl font-bold text-white">Opportunity Map</h1>
            <p className="text-slate-400 max-w-sm">
                Discover jobs, events, and training grounded in the land around you.
            </p>
            <div className="w-full max-w-md h-64 bg-slate-800/50 rounded-xl border border-slate-700 flex items-center justify-center">
                <span className="text-slate-500">Map Integration Coming Soon</span>
            </div>
        </div>
    );
}

import { SectionHeader } from "@/components/SectionHeader";

export function YouTubeSection() {
    const channelId = "UCNU_AdHFo34l_LMjqEAyt3w";
    const uploadsPlaylistId = "UUNU_AdHFo34l_LMjqEAyt3w"; // Replace UC with UU for uploads playlist

    return (
        <section className="mt-16 space-y-8">
            <SectionHeader
                eyebrow="IOPPS YouTube"
                title="Watch us on YouTube"
                subtitle="Catch our latest videos, interviews, and live streams directly from our official channel."
            />

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Live Stream Embed */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">
                        🔴 Live Channel
                    </h3>
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-lg">
                        <iframe
                            src={`https://www.youtube.com/embed/live_stream?channel=${channelId}`}
                            className="h-full w-full"
                            title="IOPPS Live Stream"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <p className="text-sm text-slate-400">
                        If we are live on YouTube, the stream will appear here. Otherwise, you'll see our channel status.
                    </p>
                </div>

                {/* Recent Uploads Embed */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">
                        📼 Recent Uploads
                    </h3>
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-lg">
                        <iframe
                            src={`https://www.youtube.com/embed?listType=playlist&list=${uploadsPlaylistId}`}
                            className="h-full w-full"
                            title="IOPPS Recent Uploads"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <p className="text-sm text-slate-400">
                        Browse our latest videos and past broadcasts.
                    </p>
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <a
                    href="https://www.youtube.com/@iopps?sub_confirmation=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#FF0000] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#D90000]"
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    Subscribe to IOPPS
                </a>
            </div>
        </section>
    );
}

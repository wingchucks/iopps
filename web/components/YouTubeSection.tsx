

export function YouTubeSection() {
    const channelId = "UCNU_AdHFo34l_LMjqEAyt3w";
    const uploadsPlaylistId = "UUNU_AdHFo34l_LMjqEAyt3w"; // Replace UC with UU for uploads playlist

    return (
        <section className="space-y-12">
            {/* Live Player Section */}
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-white">
                            <span className="mr-3 inline-block h-3 w-3 animate-pulse rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                            IOPPS Live Stream
                        </h2>
                        <p className="text-slate-400">
                            Watch our live broadcasts directly from YouTube.
                        </p>
                    </div>
                    <a
                        href="https://www.youtube.com/@iopps?sub_confirmation=1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-full bg-[#FF0000] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#D90000] shadow-lg shadow-red-900/20"
                    >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        Subscribe
                    </a>
                </div>

                <div className="aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-2xl shadow-black/50">
                    <iframe
                        src={`https://www.youtube.com/embed/live_stream?channel=${channelId}`}
                        className="h-full w-full"
                        title="IOPPS Live Stream"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>

                <div className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-4 text-sm text-slate-400">
                    <p>
                        <span className="font-semibold text-slate-200">Note:</span> If we are not currently live, this player will show our channel status or upcoming streams.
                    </p>
                </div>
            </div>

            {/* Recent Uploads Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-t border-slate-800/50 pt-8">
                    <h3 className="text-xl font-bold text-slate-200">
                        Recent Uploads & Replays
                    </h3>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
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
                    <div className="flex flex-col justify-center space-y-4 rounded-2xl border border-slate-800/50 bg-slate-800/20 p-6">
                        <h4 className="text-lg font-semibold text-white">Missed a broadcast?</h4>
                        <p className="text-slate-400">
                            Browse our complete archive of past live streams, interviews, and community events on our YouTube channel.
                        </p>
                        <div className="pt-2">
                            <a
                                href={`https://www.youtube.com/channel/${channelId}/videos`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors font-medium"
                            >
                                View all videos
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

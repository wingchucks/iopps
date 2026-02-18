interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  live?: boolean;
}

export default function YouTubePlayer({
  videoId,
  autoplay = false,
  live = false,
}: YouTubePlayerProps) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
  });
  if (autoplay) params.set("autoplay", "1");
  if (live) params.set("live", "1");

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ paddingBottom: "56.25%" }}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ border: 0 }}
      />
    </div>
  );
}

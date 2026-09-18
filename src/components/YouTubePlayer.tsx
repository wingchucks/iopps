interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  title?: string;
}

export default function YouTubePlayer({
  videoId,
  autoplay = false,
  title = "IOPPS video player",
}: YouTubePlayerProps) {
  const params = new URLSearchParams({
    rel: "0",
    playsinline: "1",
  });
  if (autoplay) params.set("autoplay", "1");

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ paddingBottom: "56.25%" }}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`}
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ border: 0 }}
      />
    </div>
  );
}

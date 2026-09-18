"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import YouTubePlayer from "@/components/YouTubePlayer";
import { useLivestreamFeed } from "@/hooks/useLivestreamFeed";
import { LIVESTREAM_INQUIRY_URL, YOUTUBE_CHANNEL_URL, YOUTUBE_LIVE_URL, videoDate, videoExcerpt, videoUrl, videoViews, type LivestreamVideo } from "@/lib/livestreams";
import styles from "./livestreams.module.css";

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}

function Thumbnail({ video, sizes }: { video: LivestreamVideo; sizes: string }) {
  return <Image src={video.thumbnail} alt="" fill sizes={sizes} unoptimized className={styles.thumbnail} />;
}

function LivestreamExperience() {
  const params = useSearchParams();
  const requestedId = params.get("video") ?? "";
  const { data, loading, error, refresh } = useLivestreamFeed(requestedId);
  const [query, setQuery] = useState("");
  const [share, setShare] = useState<{ id: string; url: string; copied: boolean } | null>(null);
  const playerRef = useRef<HTMLElement>(null);
  const videos = data ? [data.live, data.selected, ...data.recent, ...data.upcoming].filter((video): video is LivestreamVideo => Boolean(video)) : [];
  const featured = requestedId ? videos.find(video => video.id === requestedId) : data?.live ?? data?.recent[0] ?? data?.upcoming[0];
  const isLive = featured?.liveBroadcastContent === "live";
  const isUpcoming = featured?.liveBroadcastContent === "upcoming";
  const replays = data?.recent.filter(video => `${video.title} ${video.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  const warning = error ?? data?.warning;

  function chooseVideo(id: string) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("video", id); else url.searchParams.delete("video");
    if (url.href !== window.location.href) window.history.pushState(null, "", `${url.pathname}${url.search}`);
    setShare(null);
    window.requestAnimationFrame(() => {
      playerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      playerRef.current?.focus({ preventScroll: true });
    });
  }

  async function shareVideo(id: string) {
    const url = new URL("/livestreams", window.location.origin);
    url.searchParams.set("video", id);
    try {
      await navigator.clipboard.writeText(url.href);
      setShare({ id, url: url.href, copied: true });
    } catch {
      setShare({ id, url: url.href, copied: false });
    }
  }

  return <article className={styles.page}>
    <section className={styles.stage} aria-labelledby="live-heading">
      <div className={styles.wrap}>
        <header className={styles.intro}>
          <div>
            <p className={styles.wordmark}><span className={styles.signal} aria-hidden="true">◉</span> IOPPS <span>LIVE</span></p>
            <h1 id="live-heading">Closer to <span>community.</span></h1>
            <p className={styles.lead}>Powwows. Conversations. Moments that bring us together.<br className={styles.desktopBreak} /> Watch Indigenous stories unfold, wherever you are.</p>
          </div>
          <a className={styles.outlineButton} href="#replays">Explore replays <span aria-hidden="true">↓</span></a>
        </header>

        {warning && <div className={styles.notice} role="status"><span>{warning}</span><a href={YOUTUBE_LIVE_URL} target="_blank" rel="noopener noreferrer">Check YouTube ↗</a></div>}

        <div className={styles.watchGrid}>
          <section ref={playerRef} tabIndex={-1} className={styles.watch} aria-label="Video player">
            <div className={styles.playerBar}>
              <span className={`${styles.pill} ${isLive && !error ? styles.livePill : ""}`}>{loading && !featured ? "LOADING BROADCASTS" : error && isLive ? "STATUS UNAVAILABLE" : isLive ? "LIVE NOW" : isUpcoming ? "COMING UP" : featured ? "WATCH REPLAY" : "IOPPS LIVE"}</span>
              <button type="button" className={styles.refresh} disabled={loading} onClick={refresh} aria-label="Refresh broadcasts">{loading ? "Refreshing…" : "↻ Refresh"}</button>
            </div>
            {featured ? <>
              {featured.embeddable && !isUpcoming ? <YouTubePlayer key={featured.id} videoId={featured.id} title={`Watch ${featured.title}`} /> :
                <div className={styles.poster}>
                  <Thumbnail video={featured} sizes="(max-width: 900px) 100vw, 850px" />
                  <div className={styles.posterOverlay}>
                    <p>{isUpcoming ? "The next gathering starts here." : "Watch this broadcast on YouTube."}</p>
                    {isUpcoming && <p>{videoDate(featured.scheduledStart, true) || "Start time to be announced"}</p>}
                    <a className={styles.primaryButton} href={videoUrl(featured.id)} target="_blank" rel="noopener noreferrer">{isUpcoming ? "Open YouTube watch page" : "Watch on YouTube"} ↗</a>
                  </div>
                </div>}
              <div className={styles.videoInfo}>
                <p className={styles.meta}>{isUpcoming ? videoDate(featured.scheduledStart, true) : videoDate(featured.actualStart ?? featured.publishedAt)}{!isUpcoming && videoViews(featured.viewCount) ? ` · ${videoViews(featured.viewCount)}` : ""}</p>
                <h2>{featured.title}</h2>
                {featured.description && <p className={styles.description}>{videoExcerpt(featured.description)}</p>}
                <div className={styles.videoActions}>
                  <button className={styles.outlineButton} type="button" onClick={() => void shareVideo(featured.id)}>{share?.id === featured.id && share.copied ? "Link copied ✓" : "Copy video link"}</button>
                  <a href={videoUrl(featured.id)} target="_blank" rel="noopener noreferrer">{isLive ? "Watch & chat on YouTube" : "Watch on YouTube"} ↗</a>
                </div>
                {share?.id === featured.id && <div className={styles.shareResult} role="status">{share.copied ? "Ready to share — this link opens this video on IOPPS." : <label>Copy this video link<input readOnly value={share.url} onFocus={event => event.currentTarget.select()} /></label>}</div>}
                <p className={styles.playbackHelp}>Player not loading? Use the YouTube link above.</p>
              </div>
            </> : <div className={styles.emptyPlayer} role="status">
              <span className={styles.emptyPlay}><PlayIcon /></span>
              <h2>{loading ? "Finding your next watch…" : error ? "Let’s get you watching." : requestedId ? "This video isn’t available here." : "The next story is on its way."}</h2>
              <p>{loading ? "Loading broadcasts and replays from IOPPS." : error ? "The feed is temporarily unavailable. Try refreshing or open our YouTube channel." : requestedId ? "It may be private, removed, or outside the IOPPS channel. Explore the available replays below." : "Explore the channel for more coverage, and check back for upcoming broadcasts."}</p>
              {!loading && <div className={styles.videoActions}>{requestedId && <button className={styles.outlineButton} onClick={() => chooseVideo("")}>Back to IOPPS Live</button>}<a className={styles.primaryButton} href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer">Visit IOPPS on YouTube ↗</a></div>}
            </div>}
          </section>

          <aside className={styles.comingUp} aria-label="Upcoming broadcasts">
            {data?.live && featured?.id !== data.live.id && !error && <div className={styles.returnLive}><span className={`${styles.pill} ${styles.livePill}`}>LIVE NOW</span><h2>{data.live.title}</h2><button className={styles.primaryButton} onClick={() => chooseVideo(data.live!.id)}>Join the live broadcast <PlayIcon /></button></div>}
            <p className={styles.eyebrow}>STAY CONNECTED</p>
            <h2>Be there for<br />the next moment.</h2>
            {data?.upcoming.length ? <div className={styles.upcomingList}>{data.upcoming.slice(0, 3).map(video => <button key={video.id} onClick={() => chooseVideo(video.id)} className={styles.upcomingItem}>
              <span className={styles.upcomingImage}><Thumbnail video={video} sizes="80px" /></span>
              <span><strong>{video.title}</strong><small>{videoDate(video.scheduledStart, true) || "Time to be announced"}</small></span>
            </button>)}</div> : <p>{loading ? "Checking scheduled broadcasts…" : warning ? "Check YouTube for the latest broadcast schedule." : "No upcoming broadcasts are listed yet. Visit our YouTube channel and turn on notifications to hear what’s next."}</p>}
            <a className={styles.primaryButton} href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer">Follow IOPPS on YouTube ↗</a>
            <p className={styles.smallPrint}>Manage subscriptions and notifications on YouTube.</p>
            <div className={styles.asideBottom}><span aria-hidden="true">↗</span><p>Have a gathering to share?<br /><a href="#book-iopps">Bring IOPPS to your event.</a></p></div>
          </aside>
        </div>
      </div>
    </section>

    <section id="replays" className={`${styles.wrap} ${styles.library}`} aria-labelledby="replays-heading">
      <div className={styles.libraryHeader}>
        <div><p className={styles.eyebrow}>THE REPLAY COLLECTION</p><h2 id="replays-heading">Good moments. Worth another watch.</h2><p>Catch up on recent coverage from the IOPPS community.</p></div>
        <label className={styles.search}><span>Find a replay</span><input type="search" placeholder="Search events, communities…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      </div>
      {loading && !data ? <p role="status">Loading replays…</p> : replays.length ? <>
        <p className={styles.resultCount} aria-live="polite">{replays.length} {query.trim() ? "matching" : "recent"} {replays.length === 1 ? "replay" : "replays"}</p>
        <div className={styles.replayGrid}>{replays.map(video => <button key={video.id} onClick={() => chooseVideo(video.id)} className={`${styles.replayCard} ${featured?.id === video.id ? styles.selected : ""}`} aria-pressed={featured?.id === video.id}>
          <span className={styles.replayImage}><Thumbnail video={video} sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" /><span className={styles.playCircle}><PlayIcon /></span><span className={styles.imageLabel}>{featured?.id === video.id ? "IN THE PLAYER" : "REPLAY"}</span></span>
          <span className={styles.replayInfo}><span className={styles.meta}>{videoDate(video.actualStart ?? video.publishedAt)}</span><strong>{video.title}</strong><span className={styles.cardBottom}><span>{videoViews(video.viewCount) || "IOPPS coverage"}</span><span aria-hidden="true">↗</span></span></span>
        </button>)}</div>
      </> : <div className={styles.noResults} role="status"><h3>{query.trim() ? "No replays match that search." : error ? "Replays couldn’t load right now." : "More stories are coming."}</h3><p>{query.trim() ? "Try an event or community name, or explore all recent replays." : "Visit IOPPS on YouTube to explore the full video library."}</p>{query.trim() ? <button onClick={() => setQuery("")} className={styles.lightButton}>Clear search</button> : error ? <button onClick={refresh} className={styles.lightButton} disabled={loading}>Try again</button> : null}</div>}
      <a className={styles.archiveLink} href={`${YOUTUBE_CHANNEL_URL}/streams`} target="_blank" rel="noopener noreferrer">Explore the full archive on YouTube <span aria-hidden="true">↗</span></a>
    </section>

    <section id="book-iopps" className={styles.booking} aria-labelledby="booking-heading"><div className={`${styles.wrap} ${styles.bookingGrid}`}>
      <div><p className={styles.eyebrow}>YOUR EVENT. A WIDER COMMUNITY.</p><h2 id="booking-heading">Bring your next<br />gathering to the screen.</h2><p>Planning a powwow, conference, tournament or community event? Let’s talk about sharing it with the people who can’t be there in person.</p><a href={LIVESTREAM_INQUIRY_URL} className={styles.primaryButton}>Plan a livestream with IOPPS <span aria-hidden="true">↗</span></a><p className={styles.smallPrint}>Opens an email draft. Tell us your date, location and event idea.</p></div>
      <div className={styles.bookingSteps}><p><span>01</span><strong>Tell us about your event<small>Share the gathering, the place and the people.</small></strong></p><p><span>02</span><strong>Talk through the coverage<small>Discuss your broadcast needs with IOPPS.</small></strong></p><p><span>03</span><strong>Build a plan together<small>Confirm the scope and availability with our team.</small></strong></p></div>
    </div></section>
    <div className={`${styles.wrap} ${styles.communityLinks}`}><p>Keep the connection going.</p><Link href="/jobs">Find your next opportunity ↗</Link><Link href="/businesses">Meet Indigenous businesses ↗</Link></div>
    <Footer />
  </article>;
}

export default function LivestreamsPage() {
  return <AppShell><Suspense fallback={<div className={styles.loading} role="status">Loading IOPPS Live…</div>}><LivestreamExperience /></Suspense></AppShell>;
}

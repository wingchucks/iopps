import Link from "next/link";
interface DashboardStats { totalPosts: number; activePosts: number; applications: number; profileViews: number; }
interface ActivityItem { id: string; type: string; message: string; timestamp: { _seconds: number } | string; }
interface DashJob { id: string; title: string; status?: string; applicationCount: number; createdAt?: unknown; }
export function EmployerOverview({ stats, statsAvailable, activity, jobs, timeAgo, formatTimestamp, demo = false }: {
  demo?: boolean; stats: DashboardStats; statsAvailable: boolean; activity: ActivityItem[]; jobs: DashJob[];
  timeAgo: (ts: unknown) => string; formatTimestamp: (ts: unknown) => string;
}) {
  const drafts = jobs.filter((job) => job.status === "draft");
  return <>
    <div className="employer-launch">
      <div><p className="employer-eyebrow">YOUR HIRING WORKSPACE</p><h2>Build your next great team.</h2><p>Create a clear opportunity, reach candidates, and keep your hiring moving.</p></div>
      <Link href={demo ? `/demo/employer?tab=Post%20a%20Job` : "/org/dashboard/jobs/new"} className="employer-primary">+ Post a job</Link>
    </div>
    <div className="employer-actions">
      <Link href={demo ? `/demo/employer?tab=Jobs` : "/org/dashboard/jobs"}><span>01 / JOBS</span><h3>{drafts.length ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} to finish` : "Manage your openings"}</h3><p>Edit roles, review posting status, and keep listings current.</p><strong>Manage jobs →</strong></Link>
      <Link href={demo ? `/demo/employer?tab=Applicants` : "/org/dashboard/applications"}><span>02 / CANDIDATES</span><h3>Find your next hire</h3><p>Review applications, shortlist candidates, and record notes.</p><strong>Review applicants →</strong></Link>
      <Link href={demo ? `/demo/employer?tab=Profile` : "/org/dashboard?tab=Edit%20Profile"}><span>03 / YOUR ORGANIZATION</span><h3>Make a strong first impression</h3><p>Tell candidates who you are and why they should join you.</p><strong>Edit employer profile →</strong></Link>
    </div>
    <EmployerMetrics stats={stats} available={statsAvailable} />
    <div className="employer-columns">
      <section className="employer-panel"><div className="employer-section-heading"><h2>Recent jobs</h2><Link href={demo ? `/demo/employer?tab=Jobs` : "/org/dashboard/jobs"}>View all →</Link></div>
        {!jobs.length ? <div className="employer-empty"><h3>Your first opportunity starts here.</h3><p>Draft your job, choose how candidates apply, then review it before publishing.</p><Link href={demo ? `/demo/employer?tab=Post%20a%20Job` : "/org/dashboard/jobs/new"} className="employer-primary">Create your first job</Link></div> : jobs.slice(0, 5).map(job => <Link key={job.id} className="employer-job-row" href={demo ? `/demo/employer?tab=Jobs&job=${job.id}` : `/org/dashboard/jobs/${job.id}/edit`}><div><span className="employer-status">{job.status || "active"}</span><h3>{job.title}</h3><p>{formatTimestamp(job.createdAt)}</p></div><span>{job.applicationCount || 0} applications <span aria-hidden="true">↗</span></span></Link>)}
      </section>
      <section className="employer-panel"><h2>Recent activity</h2>{!activity.length ? <p className="employer-empty">No activity to show yet.</p> : activity.slice(0,5).map(item => <div className="employer-activity" key={item.id}><p>{item.message}</p><small>{timeAgo(item.timestamp)}</small></div>)}<div className="employer-note"><strong>Where applications arrive</strong><p>Applications submitted on IOPPS appear in your applicant workspace. When a job links to an external careers site, review those applications there.</p></div></section>
    </div>
  </>;
}

export function EmployerMetrics({stats, available}: {stats: DashboardStats; available: boolean}) {
  return <div className="employer-metrics">{[
    ["Total job posts", stats.totalPosts], ["Active job posts", stats.activePosts],
    ["Recorded applications", stats.applications], ["Recorded profile views", stats.profileViews],
  ].map(([label,value]) => <div className="employer-panel" key={label}><span>{label}</span><strong>{available ? value : "—"}</strong>{!available && <small>Unavailable</small>}</div>)}</div>;
}


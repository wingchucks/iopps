"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getQuickRecommendations,
  getJobRecommendations,
  getScholarshipRecommendations,
  getEventRecommendations,
  getNetworkingRecommendations,
} from "@/lib/firestore";
import type {
  RecommendedItem,
  NetworkingRecommendation,
} from "@/lib/firestore";
import type { JobPosting, Scholarship, Conference, PowwowEvent } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sparkles,
  Briefcase,
  GraduationCap,
  Calendar,
  Users,
  ChevronRight,
  TrendingUp,
  MapPin,
  Building2,
  Clock,
  Star,
  UserPlus,
} from "lucide-react";

interface RecommendationsWidgetProps {
  variant?: "compact" | "full";
  category?: "all" | "jobs" | "scholarships" | "events" | "people";
  maxItems?: number;
}

export default function RecommendationsWidget({
  variant = "compact",
  category = "all",
  maxItems = 5,
}: RecommendationsWidgetProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<RecommendedItem<JobPosting>[]>([]);
  const [scholarships, setScholarships] = useState<RecommendedItem<Scholarship>[]>([]);
  const [events, setEvents] = useState<RecommendedItem<Conference | PowwowEvent>[]>([]);
  const [people, setPeople] = useState<NetworkingRecommendation[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadRecommendations = async () => {
      try {
        setLoading(true);

        if (category === "all") {
          const quick = await getQuickRecommendations(user.uid);
          if (quick.topJob) setJobs([quick.topJob]);
          if (quick.topScholarship) setScholarships([quick.topScholarship]);
          if (quick.topEvent) setEvents([quick.topEvent]);
          if (quick.topConnection) setPeople([quick.topConnection]);
        } else {
          switch (category) {
            case "jobs":
              setJobs(await getJobRecommendations(user.uid, maxItems));
              break;
            case "scholarships":
              setScholarships(await getScholarshipRecommendations(user.uid, maxItems));
              break;
            case "events":
              setEvents(await getEventRecommendations(user.uid, maxItems));
              break;
            case "people":
              setPeople(await getNetworkingRecommendations(user.uid, maxItems));
              break;
          }
        }
      } catch (error) {
        console.error("Error loading recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [user, category, maxItems]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMatchScore = (score: number) => {
    if (score >= 80) return { label: "Excellent match", color: "text-emerald-400" };
    if (score >= 60) return { label: "Good match", color: "text-blue-400" };
    if (score >= 40) return { label: "Fair match", color: "text-amber-400" };
    return { label: "Potential match", color: "text-slate-400" };
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">Recommended for You</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasRecommendations =
    jobs.length > 0 || scholarships.length > 0 || events.length > 0 || people.length > 0;

  if (!hasRecommendations) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">Recommended for You</h3>
        </div>
        <div className="text-center py-8">
          <Sparkles className="h-12 w-12 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">Complete your profile to get personalized recommendations</p>
          <Link
            href="/member/dashboard?tab=profile"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
          >
            Update Profile
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Recommended for You</h3>
          </div>
          <Link
            href="/member/dashboard?tab=discover"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            See all
          </Link>
        </div>

        <div className="space-y-3">
          {/* Top Job */}
          {jobs[0] && (
            <Link
              href={`/jobs/${jobs[0].item.id}`}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Briefcase className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                  {jobs[0].item.title}
                </p>
                <p className="text-sm text-slate-400 truncate">{jobs[0].item.employerName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${formatMatchScore(jobs[0].score.total).color}`}>
                    {jobs[0].score.total}% match
                  </span>
                  {jobs[0].matchReasons[0] && (
                    <span className="text-xs text-slate-500">• {jobs[0].matchReasons[0]}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
            </Link>
          )}

          {/* Top Scholarship */}
          {scholarships[0] && (
            <Link
              href={`/scholarships/${scholarships[0].item.id}`}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-amber-500/20">
                <GraduationCap className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                  {scholarships[0].item.title}
                </p>
                <p className="text-sm text-slate-400 truncate">{scholarships[0].item.provider}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${formatMatchScore(scholarships[0].score.total).color}`}>
                    {scholarships[0].score.total}% match
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
            </Link>
          )}

          {/* Top Event */}
          {events[0] && (
            <Link
              href={`/events/${events[0].item.id}`}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                  {"title" in events[0].item ? events[0].item.title : events[0].item.name}
                </p>
                <p className="text-sm text-slate-400 truncate">{events[0].item.location}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${formatMatchScore(events[0].score.total).color}`}>
                    {events[0].score.total}% match
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
            </Link>
          )}

          {/* Top Connection Suggestion */}
          {people[0] && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src={people[0].avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                  {getInitials(people[0].displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{people[0].displayName}</p>
                {people[0].tagline && (
                  <p className="text-sm text-slate-400 truncate">{people[0].tagline}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {people[0].matchReasons[0] && (
                    <span className="text-xs text-emerald-400">{people[0].matchReasons[0]}</span>
                  )}
                </div>
              </div>
              <Link
                href={`/member/${people[0].userId}`}
                className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full variant - detailed recommendations
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Recommended for You</h2>
        </div>
        <p className="text-sm text-slate-400">
          Based on your profile and interests
        </p>
      </div>

      {/* Jobs Section */}
      {(category === "all" || category === "jobs") && jobs.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">Job Opportunities</h3>
            </div>
            <Link
              href="/careers"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View all jobs
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {jobs.map((rec) => (
              <Link
                key={rec.item.id}
                href={`/careers/${rec.item.id}`}
                className="block p-4 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-all hover:border-emerald-500/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{rec.item.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${formatMatchScore(rec.score.total).color} bg-slate-800`}>
                        {rec.score.total}% match
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {rec.item.employerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {rec.item.location}
                      </span>
                      {rec.item.remoteFlag && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                          Remote
                        </span>
                      )}
                    </div>
                    {rec.matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rec.matchReasons.slice(0, 3).map((reason, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs"
                          >
                            <Star className="h-3 w-3" />
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Scholarships Section */}
      {(category === "all" || category === "scholarships") && scholarships.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-400" />
              <h3 className="font-semibold text-white">Scholarships</h3>
            </div>
            <Link
              href="/education/scholarships"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {scholarships.map((rec) => (
              <Link
                key={rec.item.id}
                href={`/education/scholarships/${rec.item.id}`}
                className="block p-4 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-all hover:border-amber-500/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{rec.item.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${formatMatchScore(rec.score.total).color} bg-slate-800`}>
                        {rec.score.total}% match
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{rec.item.provider}</p>
                    {rec.item.amount && (
                      <p className="text-sm text-amber-400 mt-1">
                        {typeof rec.item.amount === "string" ? rec.item.amount : `$${rec.item.amount}`}
                      </p>
                    )}
                    {rec.matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rec.matchReasons.slice(0, 2).map((reason, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs"
                          >
                            <Star className="h-3 w-3" />
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Events Section */}
      {(category === "all" || category === "events") && events.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold text-white">Upcoming Events</h3>
            </div>
            <Link
              href="/conferences"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {events.map((rec) => {
              const title = "title" in rec.item ? rec.item.title : rec.item.name;
              // Route to /conferences for conferences, /community for powwows
              const eventHref = rec.type === "conference"
                ? `/conferences/${rec.item.id}`
                : `/community/${rec.item.id}`;
              return (
                <Link
                  key={rec.item.id}
                  href={eventHref}
                  className="block p-4 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-all hover:border-purple-500/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${formatMatchScore(rec.score.total).color} bg-slate-800`}>
                          {rec.score.total}% match
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {rec.item.location}
                        </span>
                      </div>
                      {rec.matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rec.matchReasons.slice(0, 2).map((reason, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs"
                            >
                              <Star className="h-3 w-3" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* People Section */}
      {(category === "all" || category === "people") && people.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold text-white">People to Connect With</h3>
            </div>
            <Link
              href="/members"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View community
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {people.map((person) => (
              <Link
                key={person.userId}
                href={`/member/${person.userId}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:bg-slate-800/50 transition-all hover:border-emerald-500/30"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={person.avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    {getInitials(person.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{person.displayName}</p>
                  {person.tagline && (
                    <p className="text-sm text-slate-400 truncate">{person.tagline}</p>
                  )}
                  {person.matchReasons[0] && (
                    <p className="text-xs text-emerald-400 mt-1">{person.matchReasons[0]}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${formatMatchScore(person.matchScore).color}`}>
                    {person.matchScore}%
                  </span>
                  <p className="text-xs text-slate-500">match</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getNetworkingRecommendations } from "@/lib/firestore";
import type { NetworkingRecommendation } from "@/lib/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import {
  Users,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
  Building2,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ChevronRight,
  Star,
  UserPlus,
} from "lucide-react";

export default function DiscoverPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<NetworkingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const recs = await getNetworkingRecommendations(user.uid, 20);
      setRecommendations(recs);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRecommendations = async () => {
    if (!user || refreshing) return;

    try {
      setRefreshing(true);
      const recs = await getNetworkingRecommendations(user.uid, 20);
      setRecommendations(recs);
    } catch (error) {
      console.error("Error refreshing recommendations:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMatchColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 50) return "text-blue-400";
    if (score >= 30) return "text-amber-400";
    return "text-slate-400";
  };

  const getMatchLabel = (score: number) => {
    if (score >= 70) return "Strong match";
    if (score >= 50) return "Good match";
    if (score >= 30) return "Potential match";
    return "Match";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center p-8 rounded-2xl border border-slate-800 bg-slate-900/50 max-w-md">
          <Users className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Sign in to Discover</h2>
          <p className="text-slate-400 mb-6">
            Connect with Indigenous professionals who share your interests and goals.
          </p>
          <Link href="/login">
            <Button className="bg-emerald-500 hover:bg-emerald-600">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <Link
            href="/members"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">People You May Know</h1>
                <p className="text-slate-400 text-sm">
                  Personalized recommendations based on your profile
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={refreshRecommendations}
              disabled={refreshing}
              className="border-slate-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No recommendations yet</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Complete your profile with your skills, experience, and interests to get personalized
              connection recommendations.
            </p>
            <Link href="/member/dashboard?tab=profile">
              <Button>Update Your Profile</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* High Match Section */}
            {recommendations.filter(r => r.matchScore >= 50).length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400" />
                  Top Matches
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recommendations
                    .filter(r => r.matchScore >= 50)
                    .slice(0, 6)
                    .map((person) => (
                      <div
                        key={person.userId}
                        className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <Link href={`/member/${person.userId}`}>
                            <Avatar className="h-14 w-14 border-2 border-slate-800 hover:border-emerald-500/50 transition-colors">
                              <AvatarImage src={person.avatarUrl} />
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                                {getInitials(person.displayName)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={`/member/${person.userId}`}>
                              <h3 className="font-semibold text-white truncate hover:text-emerald-400 transition-colors">
                                {person.displayName}
                              </h3>
                            </Link>
                            {person.tagline && (
                              <p className="text-sm text-slate-400 truncate">{person.tagline}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-sm font-medium ${getMatchColor(person.matchScore)}`}>
                                {person.matchScore}% match
                              </span>
                              <span className="text-xs text-slate-500">
                                • {getMatchLabel(person.matchScore)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        {person.matchReasons.length > 0 && (
                          <div className="mt-4 space-y-1">
                            {person.matchReasons.slice(0, 2).map((reason, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-sm text-slate-400"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                {reason}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Shared Skills */}
                        {person.sharedSkills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {person.sharedSkills.slice(0, 3).map((skill) => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 rounded bg-emerald-500/10 text-xs text-emerald-400"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Indigenous Affiliation */}
                        {person.indigenousAffiliation && (
                          <p className="mt-3 text-xs text-emerald-400 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {person.indigenousAffiliation}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex items-center gap-2">
                          <ConnectionButton
                            targetUserId={person.userId}
                            className="flex-1"
                          />
                          <Link href={`/member/${person.userId}`}>
                            <Button variant="ghost" size="sm" className="text-slate-400">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Other Recommendations */}
            {recommendations.filter(r => r.matchScore < 50).length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-400" />
                  More Suggestions
                </h2>
                <div className="space-y-3">
                  {recommendations
                    .filter(r => r.matchScore < 50)
                    .map((person) => (
                      <div
                        key={person.userId}
                        className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-all flex items-center gap-4"
                      >
                        <Link href={`/member/${person.userId}`}>
                          <Avatar className="h-12 w-12 border-2 border-slate-800">
                            <AvatarImage src={person.avatarUrl} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                              {getInitials(person.displayName)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/member/${person.userId}`}>
                            <h3 className="font-medium text-white hover:text-emerald-400 transition-colors">
                              {person.displayName}
                            </h3>
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                            {person.tagline && (
                              <span className="truncate max-w-[200px]">{person.tagline}</span>
                            )}
                            {person.indigenousAffiliation && (
                              <span className="text-emerald-400">
                                {person.indigenousAffiliation}
                              </span>
                            )}
                          </div>
                          {person.matchReasons[0] && (
                            <p className="text-xs text-slate-500 mt-1">
                              {person.matchReasons[0]}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-sm ${getMatchColor(person.matchScore)}`}>
                            {person.matchScore}%
                          </span>
                          <ConnectionButton
                            targetUserId={person.userId}
                            className="px-3 py-1.5 text-sm border-slate-600"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Tips Section */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="font-semibold text-white mb-4">Improve Your Recommendations</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <Briefcase className="h-8 w-8 text-blue-400 mb-3" />
                  <h4 className="font-medium text-white mb-1">Add Your Experience</h4>
                  <p className="text-sm text-slate-400">
                    Connect with others who've worked at similar companies or in similar roles.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <Building2 className="h-8 w-8 text-purple-400 mb-3" />
                  <h4 className="font-medium text-white mb-1">List Your Skills</h4>
                  <p className="text-sm text-slate-400">
                    Find professionals with complementary or shared skills.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <GraduationCap className="h-8 w-8 text-amber-400 mb-3" />
                  <h4 className="font-medium text-white mb-1">Add Your Education</h4>
                  <p className="text-sm text-slate-400">
                    Connect with alumni from your school or program.
                  </p>
                </div>
              </div>
              <Link href="/member/dashboard?tab=profile" className="inline-block mt-4">
                <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  Update Your Profile
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { upsertMemberProfile } from "@/lib/firestore";
import { completeOnboarding, skipOnboarding, type UserIntent } from "@/lib/firestore/memberSettings";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  Briefcase,
  GraduationCap,
  Calendar,
  Users,
  Search,
  Compass,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Upload,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface OnboardingFlowProps {
  onComplete: () => void;
  userName?: string;
}

const INTENT_OPTIONS: { id: UserIntent; label: string; description: string; icon: typeof Briefcase }[] = [
  {
    id: "find-job",
    label: "Find a Job",
    description: "Browse and apply to job opportunities",
    icon: Briefcase,
  },
  {
    id: "explore-careers",
    label: "Explore Careers",
    description: "Discover career paths and opportunities",
    icon: Compass,
  },
  {
    id: "attend-events",
    label: "Attend Events",
    description: "Find conferences, pow wows, and community events",
    icon: Calendar,
  },
  {
    id: "find-scholarships",
    label: "Find Scholarships",
    description: "Discover scholarships and training programs",
    icon: GraduationCap,
  },
  {
    id: "connect-professionals",
    label: "Connect with Professionals",
    description: "Network with Indigenous professionals",
    icon: Users,
  },
  {
    id: "browse-community",
    label: "Browse the Community",
    description: "Explore what IOPPS has to offer",
    icon: Search,
  },
];

export function OnboardingFlow({ onComplete, userName }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIntents, setSelectedIntents] = useState<UserIntent[]>([]);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);

  const totalSteps = 4;

  const handleSkip = async () => {
    if (!user) return;
    try {
      await skipOnboarding(user.uid);
      onComplete();
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      onComplete();
    }
  };

  const handleIntentToggle = (intent: UserIntent) => {
    setSelectedIntents((prev) =>
      prev.includes(intent)
        ? prev.filter((i) => i !== intent)
        : [...prev, intent]
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, GIF, or WebP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const photoRef = ref(storage!, `users/${user.uid}/avatar/profile.${file.name.split('.').pop()}`);
      await uploadBytes(photoRef, file);
      const url = await getDownloadURL(photoRef);
      setAvatarUrl(url);
      toast.success("Photo uploaded!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Error uploading photo");
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setCompleting(true);
    try {
      // Save profile data
      const profileData: Record<string, unknown> = {};
      if (bio) profileData.bio = bio;
      if (location) profileData.location = location;
      if (affiliation) profileData.indigenousAffiliation = affiliation;
      if (avatarUrl) profileData.avatarUrl = avatarUrl;

      if (Object.keys(profileData).length > 0) {
        await upsertMemberProfile(user.uid, profileData as Parameters<typeof upsertMemberProfile>[1]);
      }

      // Mark onboarding complete
      await completeOnboarding(user.uid, selectedIntents);

      toast.success("Welcome to IOPPS!");
      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Error saving your preferences");
      onComplete();
    } finally {
      setCompleting(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return selectedIntents.length > 0;
    return true; // Other steps are optional
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-5" />

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute right-4 top-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
      >
        Skip for now
        <X className="h-4 w-4" />
      </button>

      {/* Main Content */}
      <div className="relative w-full max-w-2xl px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Step {currentStep + 1} of {totalSteps}</span>
            <span className="text-sm text-slate-400">{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-sm shadow-2xl">
          {/* Step 0: Welcome & Intent */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white">
                  Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}!
                </h1>
                <p className="mt-2 text-slate-400">
                  What brings you to IOPPS? Select all that apply.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {INTENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedIntents.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleIntentToggle(option.id)}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      }`}
                    >
                      <div className={`rounded-lg p-2 ${
                        isSelected ? "bg-emerald-500/20" : "bg-slate-700/50"
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          isSelected ? "text-emerald-400" : "text-slate-400"
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          isSelected ? "text-emerald-400" : "text-slate-200"
                        }`}>
                          {option.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Profile Photo */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Add a Profile Photo</h2>
                <p className="mt-2 text-slate-400">
                  Profiles with photos get 3x more views from employers
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <Avatar className="h-32 w-32 border-4 border-slate-700">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-3xl">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-700">
                    <Upload className="h-4 w-4" />
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </div>
                </label>

                <p className="mt-4 text-center text-xs text-slate-500">
                  JPG, PNG, GIF or WebP (max 5MB)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Tell Us About Yourself</h2>
                <p className="mt-2 text-slate-400">
                  This helps others in the community learn about you
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Short Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={200}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="A brief introduction about yourself..."
                  />
                  <p className="mt-1 text-xs text-slate-500">{bio.length}/200 characters</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="City, Province/Territory"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Indigenous Affiliation
                  </label>
                  <input
                    type="text"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Your nation, community, or affiliation"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Next Steps */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">You're All Set!</h2>
                <p className="mt-2 text-slate-400">
                  Based on your interests, here's what to do next
                </p>
              </div>

              <div className="space-y-3">
                {selectedIntents.includes("find-job") && (
                  <div className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <Briefcase className="h-6 w-6 text-emerald-400" />
                    <div>
                      <p className="font-medium text-white">Browse Job Opportunities</p>
                      <p className="text-sm text-slate-400">Check out the latest positions in your field</p>
                    </div>
                  </div>
                )}

                {selectedIntents.includes("attend-events") && (
                  <div className="flex items-center gap-4 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                    <Calendar className="h-6 w-6 text-purple-400" />
                    <div>
                      <p className="font-medium text-white">Explore Upcoming Events</p>
                      <p className="text-sm text-slate-400">Find conferences and pow wows near you</p>
                    </div>
                  </div>
                )}

                {selectedIntents.includes("find-scholarships") && (
                  <div className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <GraduationCap className="h-6 w-6 text-amber-400" />
                    <div>
                      <p className="font-medium text-white">Discover Scholarships</p>
                      <p className="text-sm text-slate-400">Find funding for your education</p>
                    </div>
                  </div>
                )}

                {selectedIntents.includes("connect-professionals") && (
                  <div className="flex items-center gap-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <Users className="h-6 w-6 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">Build Your Network</p>
                      <p className="text-sm text-slate-400">Connect with Indigenous professionals</p>
                    </div>
                  </div>
                )}

                {(selectedIntents.includes("explore-careers") || selectedIntents.includes("browse-community")) && (
                  <div className="flex items-center gap-4 rounded-xl border border-teal-500/20 bg-teal-500/10 p-4">
                    <Compass className="h-6 w-6 text-teal-400" />
                    <div>
                      <p className="font-medium text-white">Explore the Platform</p>
                      <p className="text-sm text-slate-400">Discover all that IOPPS has to offer</p>
                    </div>
                  </div>
                )}

                {/* Always show profile completion tip */}
                <div className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                  <Check className="h-6 w-6 text-slate-400" />
                  <div>
                    <p className="font-medium text-white">Complete Your Profile</p>
                    <p className="text-sm text-slate-400">Add skills and experience to stand out</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="text-slate-400 hover:text-white disabled:opacity-0"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === currentStep
                    ? "bg-emerald-500"
                    : i < currentStep
                    ? "bg-emerald-500/50"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextStep}
            disabled={!canProceed() || completing}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white disabled:opacity-50"
          >
            {completing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === totalSteps - 1 ? "Get Started" : "Continue"}
            {currentStep < totalSteps - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

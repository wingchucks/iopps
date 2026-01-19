"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { getAuth } from "firebase/auth";
import type {
  PosterAnalysisType,
  PosterAnalysisResult,
  PowwowExtractedData,
  ConferenceExtractedData,
  ScholarshipExtractedData,
} from "@/lib/googleAi";

interface PosterUploaderProps {
  eventType: PosterAnalysisType;
  onDataExtracted: (data: PowwowExtractedData | ConferenceExtractedData | ScholarshipExtractedData) => void;
  onImageUploaded?: (imageUrl: string) => void;
  onFileSelect?: (file: File) => void;
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// Helper function to sleep for a given duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to calculate exponential backoff delay
const getBackoffDelay = (attempt: number): number => {
  // Exponential backoff: 1s, 2s, 4s + jitter
  const exponentialDelay = INITIAL_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 500; // Add 0-500ms jitter
  return exponentialDelay + jitter;
};

export function PosterUploader({
  eventType,
  onDataExtracted,
  onImageUploaded,
  onFileSelect,
}: PosterUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PosterAnalysisResult | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const eventTypeLabels: Record<PosterAnalysisType, string> = {
    powwow: "Event",
    conference: "Conference",
    scholarship: "Scholarship",
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = async (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid image (JPEG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large. Maximum size is 10MB.");
      return;
    }

    // Call onFileSelect if provided
    if (onFileSelect) {
      onFileSelect(file);
    }

    setError(null);
    setAnalysisResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze the poster
    setIsAnalyzing(true);
    setRetryStatus(null);

    try {
      // Get auth token
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in to use this feature.");
      }

      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("image", file);
      formData.append("eventType", eventType);

      // Retry loop with exponential backoff
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = getBackoffDelay(attempt - 1);
            setRetryStatus(`AI is busy. Retrying in ${Math.round(delay / 1000)}s... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await sleep(delay);
            setRetryStatus(`Retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          }

          const response = await fetch("/api/ai/analyze-poster", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            },
            body: formData,
          });

          const data = await response.json();

          // If rate limited (429), retry with backoff
          if (response.status === 429) {
            lastError = new Error(data.error || "AI service is busy");
            continue; // Try again
          }

          if (!response.ok) {
            throw new Error(data.error || "Failed to analyze poster");
          }

          // Success!
          setRetryStatus(null);
          setAnalysisResult(data.result);

          // Pass extracted data to parent
          if (data.result?.data) {
            onDataExtracted(data.result.data);
          }

          // Optionally pass image URL
          if (onImageUploaded && previewUrl) {
            onImageUploaded(previewUrl);
          }

          return; // Exit on success
        } catch (fetchError: any) {
          lastError = fetchError;
          // Only retry on network errors or rate limits, not on other errors
          if (!fetchError.message?.includes("rate") && !fetchError.message?.includes("busy") && attempt === 0) {
            throw fetchError;
          }
        }
      }

      // All retries exhausted
      throw lastError || new Error("Failed after multiple attempts");
    } catch (err: any) {
      console.error("Poster analysis error:", err);
      const isRateLimit = err.message?.includes("unavailable") || err.message?.includes("busy") || err.message?.includes("rate");
      setError(
        isRateLimit
          ? "AI service is temporarily unavailable due to high usage. Please try again in a few minutes, or fill in the form manually."
          : err.message || "Failed to analyze poster. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
      setRetryStatus(null);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setAnalysisResult(null);
    setError(null);
    setRetryStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderExtractedData = () => {
    if (!analysisResult?.data) return null;

    const data = analysisResult.data;

    if (eventType === "powwow") {
      const powwowData = data as PowwowExtractedData;
      return (
        <div className="space-y-3">
          <DataField label="Event Name" value={powwowData.name} />
          <DataField label="Host" value={powwowData.host} />
          <DataField label="Location" value={powwowData.location} />
          <DataField label="Date Range" value={powwowData.dateRange} />
          <DataField label="Description" value={powwowData.description} multiline />
          <DataField label="Registration" value={powwowData.registrationStatus} />
          <DataField label="Livestream" value={powwowData.livestream ? "Yes" : "No"} />
          <DataField label="Contact" value={powwowData.contactInfo} />
          <DataField label="Website" value={powwowData.website} />
        </div>
      );
    }

    if (eventType === "conference") {
      const confData = data as ConferenceExtractedData;
      return (
        <div className="space-y-3">
          <DataField label="Title" value={confData.title} />
          <DataField label="Organizer" value={confData.organizerName} />
          <DataField label="Location" value={confData.location} />
          <DataField label="Start Date" value={confData.startDate} />
          <DataField label="End Date" value={confData.endDate} />
          <DataField label="Description" value={confData.description} multiline />
          <DataField label="Cost" value={confData.cost} />
          <DataField label="Format" value={confData.format} />
          <DataField label="Registration URL" value={confData.registrationUrl} />
          {confData.speakers && confData.speakers.length > 0 && (
            <DataField label="Speakers" value={confData.speakers.join(", ")} />
          )}
          {confData.topics && confData.topics.length > 0 && (
            <DataField label="Topics" value={confData.topics.join(", ")} />
          )}
        </div>
      );
    }

    if (eventType === "scholarship") {
      const scholData = data as ScholarshipExtractedData;
      return (
        <div className="space-y-3">
          <DataField label="Title" value={scholData.title} />
          <DataField label="Provider" value={scholData.provider} />
          <DataField label="Amount" value={scholData.amount} />
          <DataField label="Deadline" value={scholData.deadline} />
          <DataField label="Level" value={scholData.level} />
          <DataField label="Region" value={scholData.region} />
          <DataField label="Type" value={scholData.type} />
          <DataField label="Description" value={scholData.description} multiline />
          {scholData.eligibility && scholData.eligibility.length > 0 && (
            <DataField label="Eligibility" value={scholData.eligibility.join(", ")} />
          )}
          <DataField label="Apply URL" value={scholData.applicationUrl} />
          <DataField label="Contact" value={scholData.contactInfo} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${isDragging
          ? "border-emerald-500 bg-emerald-500/10"
          : "border-slate-700 bg-slate-900/50 hover:border-emerald-500/50 hover:bg-slate-900/70"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <svg
            className="h-8 w-8 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-white">
          Upload {eventTypeLabels[eventType]} Poster
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Drag and drop an image or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Our AI will automatically extract event details from the poster
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Supported: JPEG, PNG, WebP, GIF (max 10MB)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Preview and Analysis Results */}
      {previewUrl && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
          <div className="flex items-start justify-between">
            <h4 className="text-lg font-semibold text-white">
              {isAnalyzing ? "Analyzing..." : "Extracted Information"}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="rounded-lg px-3 py-1 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {/* Image Preview */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-700">
              <Image
                src={previewUrl}
                alt="Uploaded poster"
                fill
                className="object-contain"
              />
            </div>

            {/* Extracted Data */}
            <div>
              {isAnalyzing ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                    <p className="mt-4 text-sm text-slate-400">
                      {retryStatus || "AI is reading the poster..."}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {retryStatus ? "Please wait while we retry" : "This may take a few seconds"}
                    </p>
                  </div>
                </div>
              ) : analysisResult ? (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                      AI Extracted
                    </span>
                    <span className="text-xs text-slate-500">
                      Review and edit in the form below
                    </span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto pr-2">
                    {renderExtractedData()}
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-slate-500">
                  <p>Analysis results will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for displaying extracted data fields
function DataField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  if (!value) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-sm text-slate-200 ${multiline ? "whitespace-pre-wrap" : ""
          }`}
      >
        {value}
      </p>
    </div>
  );
}

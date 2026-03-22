"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PROFILE_MEDIA_ALLOWED_MIME_TYPES,
  PROFILE_MEDIA_MAX_BYTES,
  PROFILE_MEDIA_MAX_GALLERY_ITEMS,
  type ProfileMediaSlot,
} from "@/lib/profile-media";

type SingleMediaSlot = Exclude<ProfileMediaSlot, "gallery">;
type ProfileMediaStatus = "ready" | "uploading" | "error";
type ProfileMediaSource = "existing" | "local" | "google-drive" | "link";

interface FileUploadRequest {
  kind: "file";
  file: File;
}

interface LinkUploadRequest {
  kind: "link";
  url: string;
}

interface GoogleDriveUploadRequest {
  kind: "google-drive";
  fileId: string;
  accessToken: string;
  originalName?: string;
}

type ProfileMediaUploadRequest = FileUploadRequest | LinkUploadRequest | GoogleDriveUploadRequest;

export interface ProfileMediaItemState {
  id: string;
  url: string;
  status: ProfileMediaStatus;
  source: ProfileMediaSource;
  error?: string;
  originalName?: string;
  request?: ProfileMediaUploadRequest;
}

interface BaseProps {
  title: string;
  description: string;
  getToken: () => Promise<string>;
  disabled?: boolean;
}

interface SingleUploaderProps extends BaseProps {
  mode: "single";
  slot: SingleMediaSlot;
  value: string;
  onPersist: (url: string) => Promise<void>;
}

interface GalleryUploaderProps extends BaseProps {
  mode: "gallery";
  slot: "gallery";
  values: string[];
  onChange: (urls: string[]) => void;
  maxItems?: number;
}

type ProfileMediaUploaderProps = SingleUploaderProps | GalleryUploaderProps;

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const AMBER = "#D97706";
const AMBER_RGB = "217,119,6";

function createClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createExistingGalleryItem(url: string): ProfileMediaItemState {
  return {
    id: createClientId(),
    url,
    status: "ready",
    source: "existing",
  };
}

function getSourceLabel(source: ProfileMediaSource): string {
  switch (source) {
    case "google-drive":
      return "Google Drive";
    case "link":
      return "Cloud Link";
    case "local":
      return "Local Upload";
    default:
      return "Saved";
  }
}

function describeMaxSize(): string {
  return `${Math.round(PROFILE_MEDIA_MAX_BYTES / (1024 * 1024))}MB`;
}

function loadExternalScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export default function ProfileMediaUploader(props: ProfileMediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const singleProps = props.mode === "single" ? props : null;
  const galleryProps = props.mode === "gallery" ? props : null;

  const isGallery = props.mode === "gallery";
  const maxGalleryItems = galleryProps?.maxItems || PROFILE_MEDIA_MAX_GALLERY_ITEMS;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const googleAppId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID;
  const googleConfigured = Boolean(googleClientId && googleApiKey && googleAppId);

  const [dragActive, setDragActive] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [surfaceError, setSurfaceError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [singleStatus, setSingleStatus] = useState<ProfileMediaStatus>("ready");
  const [singleError, setSingleError] = useState("");
  const [singleRequest, setSingleRequest] = useState<ProfileMediaUploadRequest | undefined>();
  const [galleryItems, setGalleryItems] = useState<ProfileMediaItemState[]>(
    galleryProps ? galleryProps.values.map((url) => createExistingGalleryItem(url)) : []
  );

  const currentSingleUrl = singleProps?.value || "";
  const currentSinglePreview = currentSingleUrl;

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!isGallery) return;

    setGalleryItems((prev) => {
      const nextReady = (galleryProps?.values || []).map((url) => {
        const existing = prev.find((item) => item.url === url && item.status === "ready");
        return existing || createExistingGalleryItem(url);
      });

      const transient = prev.filter((item) => item.status !== "ready");
      return [...nextReady, ...transient];
    });
  }, [galleryProps?.values, isGallery]);

  useEffect(() => {
    if (!googleConfigured) return;

    let cancelled = false;
    setGoogleLoading(true);

    void Promise.all([
      loadExternalScript("google-gsi-client", "https://accounts.google.com/gsi/client"),
      loadExternalScript("google-api-client", "https://apis.google.com/js/api.js"),
    ])
      .then(
        () =>
          new Promise<void>((resolve, reject) => {
            const googleWindow = window as Window & { gapi?: { load: (name: string, callback: () => void) => void } };
            if (!googleWindow.gapi?.load) {
              reject(new Error("Google picker client is unavailable"));
              return;
            }

            googleWindow.gapi.load("picker", () => resolve());
          })
      )
      .then(() => {
        if (!cancelled) {
          setGoogleReady(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("[profile-media] failed to load Google picker", error);
          setGoogleReady(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGoogleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleConfigured]);

  const galleryCount = useMemo(
    () => (isGallery ? galleryItems.filter((item) => item.status === "ready").length : 0),
    [galleryItems, isGallery]
  );

  const clearTransientError = () => {
    setSurfaceError("");
    setSingleError("");
  };

  const acceptTypes = PROFILE_MEDIA_ALLOWED_MIME_TYPES.join(",");

  function rememberPreviewUrl(url: string) {
    previewUrlsRef.current.push(url);
    return url;
  }

  function validateLocalFile(file: File) {
    if (!PROFILE_MEDIA_ALLOWED_MIME_TYPES.includes(file.type as (typeof PROFILE_MEDIA_ALLOWED_MIME_TYPES)[number])) {
      throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
    }

    if (file.size > PROFILE_MEDIA_MAX_BYTES) {
      throw new Error(`Each image must be ${describeMaxSize()} or smaller`);
    }
  }

  async function uploadRequest(slot: ProfileMediaSlot, request: ProfileMediaUploadRequest) {
    const token = await props.getToken();
    if (!token) {
      throw new Error("Sign in again to upload media");
    }

    let response: Response;

    if (request.kind === "file") {
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("file", request.file);
      response = await fetch("/api/org/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } else if (request.kind === "link") {
      response = await fetch("/api/org/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot,
          source: "link",
          url: request.url,
        }),
      });
    } else {
      response = await fetch("/api/org/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slot,
          source: "google-drive",
          fileId: request.fileId,
          accessToken: request.accessToken,
        }),
      });
    }

    const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok || !payload?.url) {
      throw new Error(payload?.error || "Upload failed");
    }

    return payload.url;
  }

  async function persistSingleUpload(request: ProfileMediaUploadRequest) {
    clearTransientError();
    setSingleStatus("uploading");
    setSingleRequest(request);

    try {
      const url = await uploadRequest(props.slot, request);
      if (!singleProps) {
        throw new Error("Single media uploader is not configured");
      }
      await singleProps.onPersist(url);
      setSingleStatus("ready");
      setSingleRequest(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setSingleStatus("error");
      setSingleError(message);
    }
  }

  function getRequestFingerprint(request: ProfileMediaUploadRequest): string {
    if (request.kind === "file") {
      return `${request.file.name}:${request.file.size}:${request.file.lastModified}`;
    }

    if (request.kind === "link") {
      return `link:${request.url.trim().toLowerCase()}`;
    }

    return `drive:${request.fileId}`;
  }

  function notifyGalleryChange(items: ProfileMediaItemState[]) {
    if (!galleryProps) return;
    galleryProps.onChange(
      items
        .filter((item) => item.status === "ready")
        .map((item) => item.url)
    );
  }

  function hasGalleryCapacity(incomingCount: number): boolean {
    if (!isGallery) return incomingCount <= 1;
    const inFlight = galleryItems.filter((item) => item.status === "uploading").length;
    return galleryCount + inFlight + incomingCount <= maxGalleryItems;
  }

  async function enqueueGalleryUpload(request: ProfileMediaUploadRequest) {
    if (!isGallery) return;

    const fingerprint = getRequestFingerprint(request);
    const alreadyQueued = galleryItems.some((item) => item.request && getRequestFingerprint(item.request) === fingerprint);
    if (alreadyQueued) {
      setSurfaceError("That image is already in your gallery queue");
      return;
    }

    const previewUrl =
      request.kind === "file" ? rememberPreviewUrl(URL.createObjectURL(request.file)) : "";
    const itemId = createClientId();
    const pendingItem: ProfileMediaItemState = {
      id: itemId,
      url: previewUrl,
      status: "uploading",
      source: request.kind === "file" ? "local" : request.kind === "link" ? "link" : "google-drive",
      originalName:
        request.kind === "file"
          ? request.file.name
          : request.kind === "google-drive"
            ? request.originalName
            : request.url,
      request,
    };

    setGalleryItems((prev) => [...prev, pendingItem]);
    clearTransientError();

    try {
      const url = await uploadRequest("gallery", request);
      setGalleryItems((prev) => {
        const duplicateReady = prev.some((item) => item.id !== itemId && item.status === "ready" && item.url === url);
        const next = duplicateReady
          ? prev.filter((item) => item.id !== itemId)
          : prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    url,
                    status: "ready" as const,
                    error: undefined,
                    request: undefined,
                  }
                : item
            );
        notifyGalleryChange(next);
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setGalleryItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "error",
                error: message,
              }
            : item
        )
      );
    }
  }

  function handleFiles(files: File[]) {
    if (files.length === 0 || props.disabled) return;

    clearTransientError();

    if (props.mode === "single") {
      try {
        validateLocalFile(files[0]);
        void persistSingleUpload({ kind: "file", file: files[0] });
      } catch (error) {
        setSingleStatus("error");
        setSingleError(error instanceof Error ? error.message : "Upload failed");
      }
      return;
    }

    const remaining = maxGalleryItems - galleryCount - galleryItems.filter((item) => item.status === "uploading").length;
    const nextFiles = files.slice(0, Math.max(remaining, 0));
    if (nextFiles.length === 0) {
      setSurfaceError(`Gallery is limited to ${maxGalleryItems} images`);
      return;
    }

    if (nextFiles.length < files.length) {
      setSurfaceError(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added`);
    }

    nextFiles.forEach((file) => {
      try {
        validateLocalFile(file);
        void enqueueGalleryUpload({ kind: "file", file });
      } catch (error) {
        setSurfaceError(error instanceof Error ? error.message : "Upload failed");
      }
    });
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    handleFiles(files);
    event.target.value = "";
  }

  function triggerBrowse() {
    inputRef.current?.click();
  }

  async function handleImportLink() {
    const trimmed = linkInput.trim();
    if (!trimmed || props.disabled) return;

    clearTransientError();

    if (props.mode === "single") {
      await persistSingleUpload({ kind: "link", url: trimmed });
      setLinkInput("");
      setShowLinkInput(false);
      return;
    }

    if (!hasGalleryCapacity(1)) {
      setSurfaceError(`Gallery is limited to ${maxGalleryItems} images`);
      return;
    }

    await enqueueGalleryUpload({ kind: "link", url: trimmed });
    setLinkInput("");
    setShowLinkInput(false);
  }

  function retrySingleUpload() {
    if (!singleRequest || props.disabled) return;
    void persistSingleUpload(singleRequest);
  }

  function retryGalleryUpload(itemId: string) {
    const item = galleryItems.find((entry) => entry.id === itemId);
    if (!item?.request || props.disabled) return;

    clearTransientError();
    setGalleryItems((prev) =>
      prev.map((entry) =>
        entry.id === itemId
          ? {
              ...entry,
              status: "uploading",
              error: undefined,
            }
          : entry
      )
    );

    void (async () => {
      try {
        const url = await uploadRequest("gallery", item.request as ProfileMediaUploadRequest);
        setGalleryItems((prev) => {
          const next = prev.map((entry) =>
            entry.id === itemId
              ? {
                  ...entry,
                  url,
                  status: "ready" as const,
                  error: undefined,
                  request: undefined,
                }
              : entry
          );
          notifyGalleryChange(next);
          return next;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setGalleryItems((prev) =>
          prev.map((entry) =>
            entry.id === itemId
              ? {
                  ...entry,
                  status: "error",
                  error: message,
                }
              : entry
          )
        );
      }
    })();
  }

  function removeGalleryItem(itemId: string) {
    if (!isGallery) return;

    setGalleryItems((prev) => {
      const next = prev.filter((item) => item.id !== itemId);
      notifyGalleryChange(next);
      return next;
    });
  }

  function handleGoogleDriveSelection(data: unknown, accessToken: string) {
    const googleWindow = window as Window & {
      google?: {
        picker?: {
          Response: Record<string, string>;
          Document: Record<string, string>;
        };
      };
    };

    const pickerNamespace = googleWindow.google?.picker;
    const responseKeys = pickerNamespace?.Response;
    const documentKeys = pickerNamespace?.Document;
    if (!responseKeys || !documentKeys || !data || typeof data !== "object") {
      setSurfaceError("Google Drive did not return a valid selection");
      return;
    }

    const payload = data as Record<string, unknown>;
    const documents = Array.isArray(payload[responseKeys.DOCUMENTS]) ? (payload[responseKeys.DOCUMENTS] as Record<string, unknown>[]) : [];
    const requests = documents
      .map((document) => {
        const fileId = document[documentKeys.ID];
        const originalName = document[documentKeys.NAME];
        if (typeof fileId !== "string" || !fileId) return null;
        return {
          kind: "google-drive" as const,
          fileId,
          accessToken,
          ...(typeof originalName === "string" ? { originalName } : {}),
        };
      })
      .filter(Boolean) as GoogleDriveUploadRequest[];

    if (requests.length === 0) {
      setSurfaceError("No Google Drive image was selected");
      return;
    }

    if (props.mode === "single") {
      void persistSingleUpload(requests[0]);
      return;
    }

    const remaining = maxGalleryItems - galleryCount - galleryItems.filter((item) => item.status === "uploading").length;
    const nextRequests = requests.slice(0, Math.max(remaining, 0));
    if (nextRequests.length === 0) {
      setSurfaceError(`Gallery is limited to ${maxGalleryItems} images`);
      return;
    }

    if (nextRequests.length < requests.length) {
      setSurfaceError(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added`);
    }

    nextRequests.forEach((request) => {
      void enqueueGalleryUpload(request);
    });
  }

  function openGoogleDrivePicker() {
    if (props.disabled) return;

    if (!googleConfigured) {
      setSurfaceError("Add the Google Drive env vars to enable Drive imports");
      return;
    }

    if (!googleReady) {
      setSurfaceError("Google Drive is still loading. Try again in a moment.");
      return;
    }

    clearTransientError();

    const googleWindow = window as Window & {
      google?: {
        accounts?: {
          oauth2?: {
            initTokenClient: (config: {
              client_id: string;
              scope: string;
              callback: (response: Record<string, unknown>) => void;
            }) => {
              requestAccessToken: (options?: { prompt?: string }) => void;
            };
          };
        };
        picker?: {
          Action: Record<string, string>;
          DocsView: new (viewId: string) => {
            setIncludeFolders: (value: boolean) => unknown;
            setMimeTypes: (value: string) => unknown;
          };
          Feature: Record<string, string>;
          PickerBuilder: new () => {
            setAppId: (value: string) => unknown;
            setDeveloperKey: (value: string) => unknown;
            setOAuthToken: (value: string) => unknown;
            addView: (value: unknown) => unknown;
            enableFeature: (value: string) => unknown;
            setCallback: (callback: (data: unknown) => void) => unknown;
            build: () => { setVisible: (value: boolean) => void };
          };
          Response: Record<string, string>;
          ViewId: Record<string, string>;
        };
      };
    };

    const tokenClient = googleWindow.google?.accounts?.oauth2?.initTokenClient({
      client_id: googleClientId || "",
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        const accessToken = typeof response.access_token === "string" ? response.access_token : "";
        if (!accessToken) {
          setSurfaceError("Google Drive authorization was cancelled");
          return;
        }

        const pickerNamespace = googleWindow.google?.picker;
        if (!pickerNamespace) {
          setSurfaceError("Google Drive picker is unavailable");
          return;
        }

        const docsView = new pickerNamespace.DocsView(pickerNamespace.ViewId.DOCS_IMAGES);
        docsView.setIncludeFolders(false);
        docsView.setMimeTypes(PROFILE_MEDIA_ALLOWED_MIME_TYPES.join(","));

        const pickerBuilder = new pickerNamespace.PickerBuilder();
        pickerBuilder.setAppId(googleAppId || "");
        pickerBuilder.setDeveloperKey(googleApiKey || "");
        pickerBuilder.setOAuthToken(accessToken);
        pickerBuilder.addView(docsView);
        if (props.mode === "gallery") {
          pickerBuilder.enableFeature(pickerNamespace.Feature.MULTISELECT_ENABLED);
        }
        pickerBuilder.setCallback((data) => {
          const responseKey = pickerNamespace.Response.ACTION;
          if (
            !data ||
            typeof data !== "object" ||
            (data as Record<string, unknown>)[responseKey] !== pickerNamespace.Action.PICKED
          ) {
            return;
          }

          handleGoogleDriveSelection(data, accessToken);
        });
        pickerBuilder.build().setVisible(true);
      },
    });

    tokenClient?.requestAccessToken({ prompt: "consent" });
  }

  const actionButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-sec, #cbd5e1)",
    fontSize: 13,
    fontWeight: 700,
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.55 : 1,
  };

  const dropzoneStyle: React.CSSProperties = {
    position: "relative",
    minHeight: props.mode === "single" ? (props.slot === "banner" ? 180 : 220) : 168,
    padding: props.mode === "single" ? 18 : 24,
    borderRadius: 18,
    border: dragActive ? `1px solid rgba(${AMBER_RGB},0.6)` : "1px dashed rgba(255,255,255,0.15)",
    background: dragActive
      ? `linear-gradient(135deg, rgba(${AMBER_RGB},0.14), rgba(20,184,166,0.08))`
      : "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(15,23,42,0.72))",
    overflow: "hidden",
    transition: "all 0.2s ease",
  };

  return (
    <div className="rounded-2xl p-5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        className="hidden"
        multiple={props.mode === "gallery"}
        onChange={handleFileInputChange}
        disabled={props.disabled}
      />

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--text, #f8fafc)" }}>
            {props.title}
          </h3>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-muted, #94a3b8)" }}>
            {props.description}
          </p>
        </div>
        {props.mode === "gallery" && (
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: AMBER }}>
              Gallery Limit
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: "var(--text, #f8fafc)" }}>
              {galleryCount}/{maxGalleryItems}
            </div>
          </div>
        )}
      </div>

      <div
        style={dropzoneStyle}
        onDragOver={(event) => {
          event.preventDefault();
          if (!props.disabled) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          const files = Array.from(event.dataTransfer.files || []);
          handleFiles(files);
        }}
      >
        {props.mode === "single" ? (
          currentSinglePreview ? (
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSinglePreview}
                alt={`${props.slot} preview`}
                className="w-full h-full object-cover"
                style={{ objectFit: props.slot === "logo" ? "contain" : "cover", background: "rgba(2,6,23,0.7)" }}
              />
              <div className="absolute inset-x-0 bottom-0 px-4 py-3" style={{ background: "linear-gradient(180deg, rgba(2,6,23,0), rgba(2,6,23,0.88))" }}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#FDBA74" }}>
                  {singleStatus === "uploading" ? "Uploading" : "Current Asset"}
                </div>
                <div className="text-sm font-semibold mt-1" style={{ color: "#fff" }}>
                  {props.slot === "logo" ? "Logo" : "Banner"} preview
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="text-3xl mb-3 opacity-70">{props.slot === "logo" ? "🧿" : "🖼️"}</div>
              <div className="text-sm font-bold" style={{ color: "var(--text, #f8fafc)" }}>
                Drag and drop a {props.slot}
              </div>
              <p className="text-[13px] mt-2 max-w-[320px]" style={{ color: "var(--text-muted, #94a3b8)" }}>
                Use local files, Google Drive, or a public cloud share link. Files are copied into IOPPS storage.
              </p>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-3xl mb-3 opacity-70">🗂️</div>
            <div className="text-sm font-bold" style={{ color: "var(--text, #f8fafc)" }}>
              Drag images here for the public gallery
            </div>
            <p className="text-[13px] mt-2 max-w-[340px]" style={{ color: "var(--text-muted, #94a3b8)" }}>
              Add workplace, team, community, or space photos. The gallery supports up to {maxGalleryItems} images.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <button type="button" style={actionButtonStyle} onClick={triggerBrowse} disabled={props.disabled}>
          Browse Files
        </button>
        <button
          type="button"
          style={actionButtonStyle}
          onClick={openGoogleDrivePicker}
          disabled={props.disabled || googleLoading || !googleConfigured}
        >
          {googleLoading ? "Loading Drive..." : googleConfigured ? "Google Drive" : "Drive Setup Needed"}
        </button>
        <button
          type="button"
          style={actionButtonStyle}
          onClick={() => setShowLinkInput((prev) => !prev)}
          disabled={props.disabled}
        >
          {showLinkInput ? "Hide Link Import" : "Import Link"}
        </button>
      </div>

      <div className="text-[11px] mt-3" style={{ color: "var(--text-muted, #64748b)" }}>
        Supported: JPEG, PNG, WebP, GIF. Max size {describeMaxSize()} each.
      </div>

      {!googleConfigured && !googleLoading && (
        <div
          className="mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(217,119,6,0.12)",
            color: "#FCD34D",
          }}
        >
          Native Google Drive picking needs project setup. Public Google Drive share links still work through Import Link.
        </div>
      )}

      {showLinkInput && (
        <div className="mt-4 flex flex-col md:flex-row gap-2">
          <input
            value={linkInput}
            onChange={(event) => setLinkInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleImportLink();
              }
            }}
            placeholder="Paste a Google Drive, Dropbox, OneDrive, SharePoint, or direct image link"
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: "rgba(2,6,23,0.6)",
              border: "1px solid rgba(30,41,59,0.6)",
              color: "var(--text, #f8fafc)",
            }}
          />
          <button
            type="button"
            onClick={() => void handleImportLink()}
            disabled={props.disabled || !linkInput.trim()}
            className="px-4 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`,
              color: "#fff",
              border: "none",
              opacity: props.disabled || !linkInput.trim() ? 0.6 : 1,
              cursor: props.disabled || !linkInput.trim() ? "not-allowed" : "pointer",
            }}
          >
            Import Image
          </button>
        </div>
      )}

      {(surfaceError || singleError) && (
        <div
          className="mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.12)",
            color: "#FCA5A5",
          }}
        >
          {surfaceError || singleError}
        </div>
      )}

      {props.mode === "single" && singleStatus === "error" && singleRequest && (
        <div className="mt-4">
          <button
            type="button"
            onClick={retrySingleUpload}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-sec, #cbd5e1)",
            }}
          >
            Retry Upload
          </button>
        </div>
      )}

      {props.mode === "gallery" && (
        <>
          {galleryItems.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted, #94a3b8)", borderColor: "rgba(255,255,255,0.12)" }}>
              Add at least one image to show your organization, team, or space.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
              {galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[16px] overflow-hidden border"
                  style={{
                    background: "rgba(2,6,23,0.55)",
                    borderColor: item.status === "error" ? "rgba(239,68,68,0.32)" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="aspect-square relative overflow-hidden">
                    {item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.originalName || "Gallery image"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl opacity-35">🖼️</div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 px-3 py-2" style={{ background: "linear-gradient(180deg, rgba(2,6,23,0), rgba(2,6,23,0.92))" }}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: item.status === "error" ? "#FCA5A5" : "#FDBA74" }}>
                        {item.status === "uploading" ? "Uploading" : item.status === "error" ? "Needs Retry" : getSourceLabel(item.source)}
                      </div>
                      <div className="text-xs mt-1 truncate" style={{ color: "#fff" }}>
                        {item.originalName || item.url || "Uploaded image"}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-3">
                    {item.error ? (
                      <div className="text-[12px] leading-5" style={{ color: "#FCA5A5" }}>
                        {item.error}
                      </div>
                    ) : (
                      <div className="text-[12px]" style={{ color: "var(--text-muted, #94a3b8)" }}>
                        {item.status === "uploading" ? "Copying into IOPPS storage..." : "Ready for your public gallery"}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      {item.status === "error" && item.request && (
                        <button
                          type="button"
                          onClick={() => retryGalleryUpload(item.id)}
                          className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold"
                          style={{
                            background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`,
                            color: "#fff",
                            border: "none",
                          }}
                        >
                          Retry
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(item.id)}
                        className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          color: "var(--text-sec, #cbd5e1)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

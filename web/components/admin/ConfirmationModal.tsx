"use client";

import { useEffect, useRef, ReactNode } from "react";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// ============================================================================
// Types
// ============================================================================

export type ConfirmationVariant = "danger" | "warning" | "success" | "info";

export interface ConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when action is confirmed */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Modal message/description */
  message: ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Visual variant */
  variant?: ConfirmationVariant;
  /** Loading state (disables buttons during action) */
  loading?: boolean;
  /** Additional warning text (e.g., "This action cannot be undone") */
  warningText?: string;
}

// ============================================================================
// Variant Styles
// ============================================================================

const variantConfig: Record<
  ConfirmationVariant,
  {
    icon: typeof ExclamationTriangleIcon;
    iconBgClass: string;
    iconClass: string;
    confirmButtonClass: string;
  }
> = {
  danger: {
    icon: ExclamationTriangleIcon,
    iconBgClass: "bg-red-500/10",
    iconClass: "text-red-400",
    confirmButtonClass: "bg-red-600 hover:bg-red-500 text-white",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconBgClass: "bg-amber-500/10",
    iconClass: "text-amber-400",
    confirmButtonClass: "bg-amber-600 hover:bg-amber-500 text-white",
  },
  success: {
    icon: CheckCircleIcon,
    iconBgClass: "bg-green-500/10",
    iconClass: "text-green-400",
    confirmButtonClass: "bg-green-600 hover:bg-green-500 text-white",
  },
  info: {
    icon: InformationCircleIcon,
    iconBgClass: "bg-teal-500/10",
    iconClass: "text-teal-400",
    confirmButtonClass: "bg-teal-600 hover:bg-teal-500 text-white",
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  warningText,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };

    // Focus confirm button when modal opens
    setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${config.iconBgClass}`}
          >
            <Icon className={`h-6 w-6 ${config.iconClass}`} />
          </div>
          <div className="flex-1">
            <h3
              id="modal-title"
              className="text-lg font-semibold text-slate-100"
            >
              {title}
            </h3>
            <div className="mt-2 text-sm text-slate-400">{message}</div>
            {warningText && (
              <p className="mt-2 text-sm font-medium text-red-400">
                {warningText}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${config.confirmButtonClass}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Specialized Modals
// ============================================================================

/** Delete confirmation modal with standard messaging */
export interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityName: string;
  entityType?: string;
  loading?: boolean;
  cascadeWarning?: string;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  entityType = "item",
  loading = false,
  cascadeWarning,
}: DeleteModalProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${entityType}?`}
      message={
        <>
          Are you sure you want to delete <strong>{entityName}</strong>?
          {cascadeWarning && (
            <span className="block mt-2">{cascadeWarning}</span>
          )}
        </>
      }
      confirmText="Delete"
      variant="danger"
      loading={loading}
      warningText="This action cannot be undone."
    />
  );
}

/** Approval confirmation modal */
export interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityName: string;
  entityType?: string;
  loading?: boolean;
  action: "approve" | "reject";
}

export function ApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  entityType = "item",
  loading = false,
  action,
}: ApprovalModalProps) {
  const isApprove = action === "approve";

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${isApprove ? "Approve" : "Reject"} ${entityType}?`}
      message={
        <>
          Are you sure you want to {action}{" "}
          <strong>{entityName}</strong>?
          {isApprove && (
            <span className="block mt-2 text-green-400">
              They will receive a notification and gain access to the platform.
            </span>
          )}
          {!isApprove && (
            <span className="block mt-2 text-red-400">
              They will be notified that their application was not approved.
            </span>
          )}
        </>
      }
      confirmText={isApprove ? "Approve" : "Reject"}
      variant={isApprove ? "success" : "danger"}
      loading={loading}
    />
  );
}

/** Status change confirmation modal */
export interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entityName: string;
  entityType?: string;
  loading?: boolean;
  newStatus: "active" | "inactive" | "suspended";
}

export function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  entityName,
  entityType = "item",
  loading = false,
  newStatus,
}: StatusChangeModalProps) {
  const statusConfig = {
    active: {
      title: "Activate",
      message: "will become visible to users",
      variant: "success" as const,
    },
    inactive: {
      title: "Deactivate",
      message: "will be hidden from users",
      variant: "warning" as const,
    },
    suspended: {
      title: "Suspend",
      message: "will be suspended and hidden from users",
      variant: "danger" as const,
    },
  };

  const config = statusConfig[newStatus];

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${config.title} ${entityType}?`}
      message={
        <>
          <strong>{entityName}</strong> {config.message}.
        </>
      }
      confirmText={config.title}
      variant={config.variant}
      loading={loading}
    />
  );
}

// ============================================================================
// Hook for managing modal state
// ============================================================================

import { useState, useCallback } from "react";

export interface UseConfirmationReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  confirm: () => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

export function useConfirmation(
  onConfirm: () => Promise<void> | void
): UseConfirmationReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    if (!loading) setIsOpen(false);
  }, [loading]);

  const confirm = useCallback(async () => {
    setLoading(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setLoading(false);
    }
  }, [onConfirm]);

  return { isOpen, open, close, confirm, setLoading, loading };
}

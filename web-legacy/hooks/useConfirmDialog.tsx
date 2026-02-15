"use client";

import React, { useState, useCallback, ReactNode } from "react";
import { ConfirmationModal, ConfirmationVariant } from "@/components/admin/ConfirmationModal";

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  warningText?: string;
}

interface UseConfirmDialogReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  ConfirmDialog: () => React.ReactElement | null;
}

/**
 * A hook that provides a promise-based confirmation dialog.
 *
 * Usage:
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: "Delete Item",
 *     message: "Are you sure you want to delete this item?",
 *     variant: "danger",
 *     warningText: "This action cannot be undone."
 *   });
 *
 *   if (confirmed) {
 *     // Perform delete action
 *   }
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     <ConfirmDialog />
 *   </>
 * );
 * ```
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    setLoading(false);

    return new Promise((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(false);
    setResolveRef(null);
    setOptions(null);
  }, [resolveRef]);

  const handleConfirm = useCallback(() => {
    setLoading(true);
    setIsOpen(false);
    resolveRef?.(true);
    setResolveRef(null);
    setOptions(null);
    setLoading(false);
  }, [resolveRef]);

  const ConfirmDialog = useCallback(() => {
    if (!options) return null;

    return (
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        loading={loading}
        warningText={options.warningText}
      />
    );
  }, [isOpen, options, handleClose, handleConfirm, loading]);

  return { confirm, ConfirmDialog };
}

/**
 * Convenience function for creating delete confirmation options
 */
export function deleteConfirmOptions(itemName: string, itemType = "item"): ConfirmOptions {
  return {
    title: `Delete ${itemType}`,
    message: (
      <>
        Are you sure you want to delete <strong>&ldquo;{itemName}&rdquo;</strong>?
      </>
    ),
    confirmText: "Delete",
    variant: "danger",
    warningText: "This action cannot be undone.",
  };
}

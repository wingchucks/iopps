"use client";

import { useState, useRef } from 'react';
import {
    CloudArrowUpIcon,
    DocumentIcon,
    XMarkIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
    ref,
    uploadBytesResumable,
    getDownloadURL
} from "firebase/storage";
import { storage } from "@/lib/firebase";

interface FileUploaderProps {
    label: string;
    accept: string; // e.g., ".pdf,.doc,.docx"
    maxSizeMB: number;
    storagePath: string; // e.g., "users/{uid}/applications/{appId}/"
    onUploadComplete: (url: string, path: string, name: string) => void;
    onError: (error: string) => void;
    className?: string;
}

export default function FileUploader({
    label,
    accept,
    maxSizeMB,
    storagePath,
    onUploadComplete,
    onError,
    className = ""
}: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedFile, setUploadedFile] = useState<{ name: string, url: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const validateFile = (file: File) => {
        // Check size
        if (file.size > maxSizeMB * 1024 * 1024) {
            onError(`File size exceeds ${maxSizeMB}MB limit.`);
            return false;
        }

        // Check type (validation based on extension and MIME type)
        const fileNameParts = file.name.split('.');
        const fileExtension = fileNameParts.length > 1
            ? "." + fileNameParts.pop()?.toLowerCase()
            : "";
        const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());

        // Check if file matches any accepted type
        const isValidType = acceptedTypes.some(type => {
            // Check extension match
            if (type.startsWith('.') && type === fileExtension) {
                return true;
            }
            // Check MIME type match
            const mimePattern = extensionToMimeType(type);
            if (mimePattern && file.type === mimePattern) {
                return true;
            }
            // Check wildcard MIME types (e.g., image/*)
            if (type.includes('*')) {
                const [category] = type.split('/');
                return file.type.startsWith(category + '/');
            }
            return false;
        });

        if (!isValidType) {
            onError(`Invalid file type. Accepted types: ${accept}`);
            return false;
        }

        return true;
    };

    const extensionToMimeType = (ext: string): string | null => {
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
        };
        return mimeTypes[ext] || null;
    }

    const uploadFile = (file: File) => {
        if (!validateFile(file)) return;
        if (!storage) {
            onError("Storage not initialized.");
            return;
        }

        setUploading(true);
        setProgress(0);

        // Create a unique filename to prevent overwrites if needed, or keep original
        // For applications, unique ID + name is usually best.
        // Clean filename
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fullPath = `${storagePath}/${Date.now()}_${cleanName}`;
        const storageRef = ref(storage, fullPath);

        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(p);
            },
            (error) => {
                console.error("Upload error:", error);
                onError("Upload failed. Please try again.");
                setUploading(false);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setUploadedFile({ name: file.name, url: downloadURL });
                    onUploadComplete(downloadURL, fullPath, file.name);
                    setUploading(false);
                    setDragActive(false);
                } catch (err) {
                    console.error("Error getting download URL", err);
                    onError("Upload completed but failed to get file URL.");
                    setUploading(false);
                }
            }
        );
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            uploadFile(e.target.files[0]);
        }
    };

    return (
        <div className={`w-full ${className}`}>
            <label className="block text-sm font-medium text-slate-300 mb-2">
                {label}
            </label>

            {uploadedFile ? (
                <div className="flex items-center justify-between p-4 bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-lg">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <CheckCircleIcon className="h-6 w-6 text-[#14B8A6] flex-shrink-0" />
                        <div className="truncate">
                            <p className="text-sm font-medium text-slate-200 truncate">{uploadedFile.name}</p>
                            <a href={uploadedFile.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#14B8A6] hover:underline">View File</a>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setUploadedFile(null);
                            if (inputRef.current) inputRef.current.value = '';
                        }}
                        className="p-1 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            ) : (
                <div
                    className={`
            relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer
            ${dragActive ? 'border-[#14B8A6] bg-[#14B8A6]/5' : 'border-slate-700 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'}
          `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        accept={accept}
                        onChange={handleChange}
                    />

                    {uploading ? (
                        <div className="w-full max-w-xs">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>Uploading...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div
                                    className="bg-[#14B8A6] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <CloudArrowUpIcon className="h-10 w-10 text-slate-400 mb-3" />
                            <p className="text-sm text-slate-300 font-medium">
                                <span className="text-[#14B8A6]">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {accept.replace(/,/g, ', ')} (Max {maxSizeMB}MB)
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

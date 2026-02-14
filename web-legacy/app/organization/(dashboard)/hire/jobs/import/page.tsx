'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getEmployerProfile, createJobPosting } from '@/lib/firestore';
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface CSVJob {
  title: string;
  location: string;
  employmentType: string;
  description: string;
  salaryMin?: string;
  salaryMax?: string;
  closingDate?: string;
  applicationLink?: string;
  indigenousPreference?: string;
  remoteFlag?: string;
  // Row number for error reporting
  row: number;
}

interface ImportResult {
  row: number;
  title: string;
  success: boolean;
  error?: string;
  jobId?: string;
}

const SAMPLE_CSV = `title,location,employmentType,description,salaryMin,salaryMax,indigenousPreference,remoteFlag,applicationLink,closingDate
"Senior Software Developer","Saskatoon, SK","Full-time","We are looking for an experienced developer to join our team. Strong JavaScript/TypeScript skills required.",70000,90000,yes,no,"https://yoursite.com/apply","2026-03-31"
"Office Administrator","Regina, SK","Full-time","Administrative support role. Experience with MS Office required.",45000,55000,yes,no,"","2026-03-15"
"Marketing Coordinator","Remote","Contract","Help us grow our brand. Social media and content creation experience needed.",50000,60000,no,yes,"",""`;

export default function BulkImportJobsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedJobs, setParsedJobs] = useState<CSVJob[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((text: string): CSVJob[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const requiredHeaders = ['title', 'location', 'employmenttype', 'description'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`Missing required column: ${required}`);
      }
    }

    const jobs: CSVJob[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v.trim())) continue;

      const job: CSVJob = {
        row: i + 1,
        title: getValue(headers, values, 'title'),
        location: getValue(headers, values, 'location'),
        employmentType: getValue(headers, values, 'employmenttype') || 'Full-time',
        description: getValue(headers, values, 'description'),
        salaryMin: getValue(headers, values, 'salarymin'),
        salaryMax: getValue(headers, values, 'salarymax'),
        closingDate: getValue(headers, values, 'closingdate'),
        applicationLink: getValue(headers, values, 'applicationlink'),
        indigenousPreference: getValue(headers, values, 'indigenouspreference'),
        remoteFlag: getValue(headers, values, 'remoteflag'),
      };

      if (!job.title || !job.description) {
        continue; // Skip rows without required fields
      }

      jobs.push(job);
    }

    return jobs;
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    try {
      const text = await selectedFile.text();
      const jobs = parseCSV(text);
      
      if (jobs.length === 0) {
        throw new Error('No valid jobs found in CSV');
      }

      setParsedJobs(jobs);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!user || parsedJobs.length === 0) return;

    setImporting(true);
    setResults([]);

    try {
      const profile = await getEmployerProfile(user.uid);
      const employerName = profile?.organizationName || (profile as unknown as Record<string, unknown>)?.companyName as string || '';

      const importResults: ImportResult[] = [];

      for (const job of parsedJobs) {
        try {
          const jobData = {
            employerId: user.uid,
            employerName,
            title: job.title,
            location: job.location,
            employmentType: job.employmentType,
            description: job.description,
            remoteFlag: job.remoteFlag?.toLowerCase() === 'yes' || job.remoteFlag?.toLowerCase() === 'true',
            indigenousPreference: job.indigenousPreference?.toLowerCase() === 'yes' || job.indigenousPreference?.toLowerCase() === 'true',
            applicationLink: job.applicationLink || undefined,
            closingDate: job.closingDate ? job.closingDate : undefined, // Pass as string, Firestore handles it
            salaryRange: (job.salaryMin || job.salaryMax) ? {
              min: job.salaryMin ? parseInt(job.salaryMin, 10) : undefined,
              max: job.salaryMax ? parseInt(job.salaryMax, 10) : undefined,
              currency: 'CAD',
              period: 'yearly' as const,
              disclosed: true,
            } : undefined,
            active: false, // Start as draft
          };

          const jobId = await createJobPosting(jobData);
          importResults.push({
            row: job.row,
            title: job.title,
            success: true,
            jobId,
          });
        } catch (err) {
          importResults.push({
            row: job.row,
            title: job.title,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      setResults(importResults);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'job-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/organization/hire/jobs"
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-foreground hover:bg-surface transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bulk Import Jobs</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Upload a CSV file to create multiple job postings at once
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Sample Download */}
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">1. Download Template</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Start with our CSV template to ensure your data is formatted correctly.
            </p>
            <button
              onClick={downloadSampleCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-[var(--card-border)] text-foreground rounded-lg hover:border-accent transition-colors"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              Download CSV Template
            </button>
          </div>

          {/* File Upload */}
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">2. Upload Your CSV</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Required columns: title, location, employmentType, description
            </p>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[var(--card-border)] rounded-xl cursor-pointer hover:border-accent transition-colors">
              <ArrowUpTrayIcon className="w-12 h-12 text-[var(--text-muted)] mb-3" />
              <span className="text-foreground font-medium">
                {file ? file.name : 'Click to upload CSV'}
              </span>
              <span className="text-sm text-[var(--text-muted)] mt-1">or drag and drop</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Format Guide */}
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4">
            <h4 className="text-blue-300 font-medium mb-2">CSV Format Guide</h4>
            <ul className="text-sm text-blue-200/80 space-y-1">
              <li>• <strong>title</strong> - Job title (required)</li>
              <li>• <strong>location</strong> - City, Province (required)</li>
              <li>• <strong>employmentType</strong> - Full-time, Part-time, Contract, Internship</li>
              <li>• <strong>description</strong> - Job description (required)</li>
              <li>• <strong>salaryMin/salaryMax</strong> - Annual salary (numbers only)</li>
              <li>• <strong>indigenousPreference</strong> - yes/no</li>
              <li>• <strong>remoteFlag</strong> - yes/no</li>
              <li>• <strong>applicationLink</strong> - External application URL</li>
              <li>• <strong>closingDate</strong> - YYYY-MM-DD format</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Preview ({parsedJobs.length} jobs)
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('upload');
                    setFile(null);
                    setParsedJobs([]);
                  }}
                  className="px-4 py-2 text-sm text-foreground border border-[var(--card-border)] rounded-lg hover:border-[var(--card-border)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-4 py-2 text-sm font-medium bg-accent text-slate-950 rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-60"
                >
                  {importing ? 'Importing...' : `Import ${parsedJobs.length} Jobs`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--card-border)]">
                    <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Row</th>
                    <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Title</th>
                    <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Location</th>
                    <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Type</th>
                    <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedJobs.slice(0, 20).map((job, i) => (
                    <tr key={i} className="border-b border-[var(--card-border)]/50">
                      <td className="py-2 px-3 text-[var(--text-muted)]">{job.row}</td>
                      <td className="py-2 px-3 text-foreground">{job.title}</td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{job.location}</td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{job.employmentType}</td>
                      <td className="py-2 px-3 text-[var(--text-secondary)]">
                        {job.salaryMin || job.salaryMax
                          ? `$${job.salaryMin || '?'} - $${job.salaryMax || '?'}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedJobs.length > 20 && (
                <p className="text-sm text-[var(--text-muted)] mt-3 text-center">
                  ... and {parsedJobs.length - 20} more jobs
                </p>
              )}
            </div>
          </div>

          <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-4">
            <p className="text-amber-300 text-sm">
              ⚠️ Jobs will be created as <strong>drafts</strong>. Review and publish them individually from your Jobs list.
            </p>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {step === 'results' && (
        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Import Complete</h3>
            
            <div className="flex gap-6 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                <span className="text-foreground font-medium">{successCount} succeeded</span>
              </div>
              {failCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircleIcon className="w-6 h-6 text-red-400" />
                  <span className="text-foreground font-medium">{failCount} failed</span>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? 'bg-green-900/10' : 'bg-red-900/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-400" />
                    )}
                    <span className="text-foreground">{result.title}</span>
                    <span className="text-xs text-[var(--text-muted)]">Row {result.row}</span>
                  </div>
                  {result.error && (
                    <span className="text-xs text-red-400">{result.error}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Link
                href="/organization/hire/jobs"
                className="px-4 py-2 text-sm font-medium bg-accent text-slate-950 rounded-lg hover:bg-accent/90 transition-colors"
              >
                View All Jobs
              </Link>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setParsedJobs([]);
                  setResults([]);
                }}
                className="px-4 py-2 text-sm text-foreground border border-[var(--card-border)] rounded-lg hover:border-[var(--card-border)] transition-colors"
              >
                Import More
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CSV parsing helpers
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function getValue(headers: string[], values: string[], key: string): string {
  const index = headers.indexOf(key);
  return index >= 0 && index < values.length ? values[index] : '';
}

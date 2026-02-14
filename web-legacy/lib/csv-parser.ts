import { JobPosting } from "./types";

export interface ParsedJob extends Partial<JobPosting> {
    errors?: string[];
}

export function parseJobCSV(csvContent: string): ParsedJob[] {
    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // Minimum required headers mapping
    // simple mapping: title -> title, location -> location, etc.

    return lines.slice(1).map(line => {
        if (!line.trim()) return null;

        // Simple CSV splitter that respects quotes
        const values: string[] = [];
        let inQuote = false;
        let currentVal = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                values.push(currentVal.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        values.push(currentVal.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        const job: ParsedJob = {
            active: false, // Default to inactive draft
            employmentType: 'Full-time', // Default
            indigenousPreference: false,
        };
        const errors: string[] = [];

        headers.forEach((header, index) => {
            const value = values[index];
            if (!value) return;

            if (header.includes('title')) job.title = value;
            else if (header.includes('location')) job.location = value;
            else if (header.includes('description')) job.description = value;
            else if (header.includes('salary')) job.salaryRange = value;
            else if (header.includes('type')) job.employmentType = value;
            else if (header.includes('email')) job.applicationEmail = value;
            else if (header.includes('link') || header.includes('url')) job.applicationLink = value;
            else if (header.includes('remote')) job.remoteFlag = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
            else if (header.includes('qualifications')) job.qualifications = value.split('\n');
            else if (header.includes('responsibilities')) job.responsibilities = value.split('\n');
        });

        if (!job.title) errors.push("Missing Title");
        if (!job.location) errors.push("Missing Location");
        if (!job.description) errors.push("Missing Description");

        // Metadata
        job.errors = errors;

        return job;
    }).filter(x => x !== null) as ParsedJob[];
}

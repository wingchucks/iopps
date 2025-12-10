import * as cheerio from "cheerio";

export interface ScrapedJob {
    title?: string;
    description?: string;
    location?: string;
    department?: string;
    jobType?: string;
    salary?: string;
    url?: string;
    applyUrl?: string;
    postedDate?: string;
    closingDate?: string;
    company?: string;
    jobId?: string;
    [key: string]: string | undefined;
}

export interface ScrapeResult {
    jobs: ScrapedJob[];
    fields: string[];
    feedType: "html";
    totalJobs: number;
    nextPageUrl?: string;
}

// Common selectors for job listings on career portals
const JOB_LIST_SELECTORS = [
    // Oracle Taleo / Oracle Recruiting Cloud
    '[data-automation-id="jobItem"]',
    '.job-item',
    '.job-listing',
    '.job-card',
    '.jobPosting',
    '.job-posting',
    '.requisition',
    '.job-result',
    '.job-row',
    // Common patterns
    '[class*="job-"]',
    '[class*="position-"]',
    '[class*="career-"]',
    '[class*="vacancy"]',
    '[class*="opening"]',
    // Table rows
    'table.jobs tbody tr',
    'table.positions tbody tr',
    // List items
    'ul.jobs li',
    'ul.job-list li',
    '.job-listings li',
    // Generic article/div patterns
    'article[class*="job"]',
    'div[class*="job"][class*="item"]',
    'div[class*="job"][class*="card"]',
];

// Selectors for individual job fields
const FIELD_SELECTORS = {
    title: [
        '[data-automation-id="jobTitle"]',
        '.job-title',
        '.position-title',
        '.job-name',
        'h2.title',
        'h3.title',
        '.title a',
        'a.job-link',
        '[class*="title"]',
        'h2',
        'h3',
    ],
    location: [
        '[data-automation-id="jobLocation"]',
        '.job-location',
        '.location',
        '[class*="location"]',
        '[class*="city"]',
        '.place',
    ],
    department: [
        '[data-automation-id="jobDepartment"]',
        '.department',
        '.job-department',
        '[class*="department"]',
        '[class*="category"]',
        '.team',
    ],
    jobType: [
        '[data-automation-id="jobType"]',
        '.job-type',
        '.employment-type',
        '[class*="type"]',
        '[class*="schedule"]',
        '.full-time',
        '.part-time',
    ],
    postedDate: [
        '[data-automation-id="postedDate"]',
        '.posted-date',
        '.date-posted',
        '[class*="posted"]',
        '[class*="date"]',
        'time',
    ],
    salary: [
        '[data-automation-id="salary"]',
        '.salary',
        '.compensation',
        '[class*="salary"]',
        '[class*="pay"]',
    ],
    description: [
        '[data-automation-id="jobDescription"]',
        '.job-description',
        '.description',
        '.summary',
        '[class*="description"]',
        '[class*="summary"]',
        'p',
    ],
    url: [
        'a[href*="job"]',
        'a[href*="position"]',
        'a[href*="requisition"]',
        'a[href*="career"]',
        'a.job-link',
        'a.title',
        '.title a',
        'h2 a',
        'h3 a',
        'a',
    ],
    jobId: [
        '[data-automation-id="jobId"]',
        '[data-job-id]',
        '.job-id',
        '.requisition-id',
        '[class*="job-id"]',
        '[class*="req-id"]',
    ],
};

/**
 * Scrape jobs from an HTML page
 */
export function scrapeJobsFromHtml(html: string, baseUrl: string): ScrapeResult {
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];
    const allFields = new Set<string>();

    // Try to find job elements using various selectors
    let jobElements: cheerio.Cheerio<cheerio.Element> | null = null;

    for (const selector of JOB_LIST_SELECTORS) {
        const elements = $(selector);
        if (elements.length > 0) {
            // Verify these look like job listings (have title-like content)
            const hasJobContent = elements.toArray().some(el => {
                const text = $(el).text().trim();
                return text.length > 10 && text.length < 5000;
            });
            if (hasJobContent) {
                jobElements = elements;
                console.log(`Found ${elements.length} job elements with selector: ${selector}`);
                break;
            }
        }
    }

    // If no specific job containers found, try to find job links
    if (!jobElements || jobElements.length === 0) {
        // Look for links that look like job postings
        const jobLinks = $('a[href*="job"], a[href*="position"], a[href*="requisition"], a[href*="career"]')
            .filter((_, el) => {
                const text = $(el).text().trim();
                // Filter out navigation links
                return text.length > 5 && text.length < 200 &&
                    !text.toLowerCase().includes('search') &&
                    !text.toLowerCase().includes('home') &&
                    !text.toLowerCase().includes('login');
            });

        if (jobLinks.length > 0) {
            console.log(`Found ${jobLinks.length} job links`);
            jobLinks.each((_, el) => {
                const $link = $(el);
                const job: ScrapedJob = {
                    title: $link.text().trim(),
                    url: resolveUrl($link.attr('href') || '', baseUrl),
                };

                // Try to get more context from parent elements
                const $parent = $link.closest('li, tr, div, article');
                if ($parent.length) {
                    extractFieldsFromElement($, $parent, job, allFields);
                }

                if (job.title) {
                    jobs.push(job);
                    Object.keys(job).forEach(k => allFields.add(k));
                }
            });
        }
    } else {
        // Extract data from job containers
        jobElements.each((_, el) => {
            const $el = $(el);
            const job: ScrapedJob = {};

            extractFieldsFromElement($, $el, job, allFields);

            // Only add if we found at least a title
            if (job.title) {
                jobs.push(job);
            }
        });
    }

    // Look for pagination
    const nextPageUrl = findNextPageUrl($, baseUrl);

    return {
        jobs,
        fields: Array.from(allFields).sort(),
        feedType: "html",
        totalJobs: jobs.length,
        nextPageUrl,
    };
}

/**
 * Extract job fields from an element
 */
function extractFieldsFromElement(
    $: cheerio.CheerioAPI,
    $el: cheerio.Cheerio<cheerio.Element>,
    job: ScrapedJob,
    allFields: Set<string>
): void {
    for (const [field, selectors] of Object.entries(FIELD_SELECTORS)) {
        if (job[field]) continue; // Already found

        for (const selector of selectors) {
            const $found = $el.find(selector).first();
            if ($found.length) {
                let value: string;

                if (field === 'url') {
                    value = $found.attr('href') || '';
                } else if (field === 'jobId') {
                    value = $found.attr('data-job-id') || $found.text().trim();
                } else {
                    value = $found.text().trim();
                }

                if (value && value.length > 0 && value.length < 5000) {
                    job[field] = value;
                    allFields.add(field);
                    break;
                }
            }
        }
    }

    // Extract any data attributes that might contain job info
    const dataAttrs = $el.attr();
    if (dataAttrs) {
        for (const [attr, value] of Object.entries(dataAttrs)) {
            if (attr.startsWith('data-') && value && typeof value === 'string') {
                const fieldName = attr.replace('data-', '').replace(/-/g, '_');
                if (!job[fieldName] && value.length < 1000) {
                    job[fieldName] = value;
                    allFields.add(fieldName);
                }
            }
        }
    }
}

/**
 * Find the next page URL for pagination
 */
function findNextPageUrl($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
    const nextSelectors = [
        'a[rel="next"]',
        'a.next',
        '.pagination a.next',
        '.pager a.next',
        'a:contains("Next")',
        'a:contains(">")',
        '[aria-label="Next"]',
        '.next-page a',
    ];

    for (const selector of nextSelectors) {
        const $next = $(selector).first();
        if ($next.length && $next.attr('href')) {
            return resolveUrl($next.attr('href')!, baseUrl);
        }
    }

    return undefined;
}

/**
 * Resolve a relative URL to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    try {
        return new URL(url, baseUrl).href;
    } catch {
        return url;
    }
}

/**
 * Check if content is HTML
 */
export function isHtmlContent(content: string, contentType: string): boolean {
    const trimmed = content.trim().toLowerCase();
    return (
        trimmed.startsWith('<!doctype html') ||
        trimmed.startsWith('<html') ||
        contentType.includes('text/html')
    );
}

/**
 * Check if content is XML
 */
export function isXmlContent(content: string, contentType: string): boolean {
    const trimmed = content.trim().toLowerCase();
    return (
        trimmed.startsWith('<?xml') ||
        contentType.includes('application/xml') ||
        contentType.includes('text/xml') ||
        contentType.includes('application/rss+xml') ||
        contentType.includes('application/atom+xml')
    );
}

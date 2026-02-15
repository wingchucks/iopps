import * as cheerio from "cheerio";

// Use ReturnType to infer Cheerio types
type CheerioSelection = ReturnType<ReturnType<typeof cheerio.load>>;

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
    isSpa?: boolean;
    spaPlatform?: string;
}

// Common selectors for job listings on career portals
const JOB_LIST_SELECTORS = [
    // Oracle Taleo / Oracle Recruiting Cloud / Oracle HCM
    '[data-automation-id="jobItem"]',
    '[data-automation-id="requisitionTitle"]',
    '.job-item',
    '.job-listing',
    '.job-card',
    '.jobPosting',
    '.job-posting',
    '.requisition',
    '.job-result',
    '.job-row',
    // Oracle Fusion specific
    '.oj-listview-item',
    '[role="listitem"]',
    '.REQ_TITLE',
    '.job-req-card',
    '.careers-job-card',
    // Workday
    '[data-automation-id="jobTitle"]',
    '.css-19uc56f', // Workday job cards
    // Common patterns
    '[class*="job-"]',
    '[class*="position-"]',
    '[class*="career-"]',
    '[class*="vacancy"]',
    '[class*="opening"]',
    '[class*="requisition"]',
    // Table rows
    'table.jobs tbody tr',
    'table.positions tbody tr',
    'table tbody tr[data-job]',
    'table tbody tr[onclick]',
    // List items
    'ul.jobs li',
    'ul.job-list li',
    '.job-listings li',
    '.careers-list li',
    // Generic article/div patterns
    'article[class*="job"]',
    'div[class*="job"][class*="item"]',
    'div[class*="job"][class*="card"]',
    // JSON-LD fallback check markers
    'script[type="application/ld+json"]',
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
 * Try to extract jobs from JSON-LD structured data
 */
function extractJobsFromJsonLd($: cheerio.CheerioAPI, baseUrl: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const jsonText = $(el).html();
            if (!jsonText) return;

            const data = JSON.parse(jsonText);
            const items = Array.isArray(data) ? data : [data];

            for (const item of items) {
                // Handle JobPosting schema
                if (item["@type"] === "JobPosting") {
                    jobs.push({
                        title: item.title || item.name,
                        description: item.description,
                        location: item.jobLocation?.address?.addressLocality ||
                            item.jobLocation?.name ||
                            (typeof item.jobLocation === "string" ? item.jobLocation : undefined),
                        company: item.hiringOrganization?.name,
                        salary: item.baseSalary?.value?.value ||
                            item.baseSalary?.value ||
                            (typeof item.baseSalary === "string" ? item.baseSalary : undefined),
                        jobType: item.employmentType,
                        url: item.url || baseUrl,
                        applyUrl: item.url || baseUrl,
                        postedDate: item.datePosted,
                        closingDate: item.validThrough,
                    });
                }

                // Handle ItemList containing JobPostings
                if (item["@type"] === "ItemList" && item.itemListElement) {
                    for (const listItem of item.itemListElement) {
                        if (listItem.item?.["@type"] === "JobPosting" || listItem["@type"] === "JobPosting") {
                            const job = listItem.item || listItem;
                            jobs.push({
                                title: job.title || job.name,
                                description: job.description,
                                location: job.jobLocation?.address?.addressLocality ||
                                    job.jobLocation?.name,
                                company: job.hiringOrganization?.name,
                                url: job.url,
                                applyUrl: job.url,
                            });
                        }
                    }
                }
            }
        } catch {
            // Invalid JSON-LD, skip
        }
    });

    return jobs;
}

/**
 * Detect if the page appears to be a JavaScript-rendered SPA
 */
function detectSpaIndicators($: cheerio.CheerioAPI, html: string): { isSpa: boolean; platform?: string } {
    const lowerHtml = html.toLowerCase();

    // Oracle Recruiting Cloud / HCM indicators
    if (lowerHtml.includes('oracle') && (
        lowerHtml.includes('recruiting') ||
        lowerHtml.includes('hcm') ||
        lowerHtml.includes('fa.ocs.oraclecloud') ||
        lowerHtml.includes('oraclecloud.com')
    )) {
        return { isSpa: true, platform: "Oracle Recruiting Cloud" };
    }

    // Workday indicators
    if (lowerHtml.includes('workday') || lowerHtml.includes('myworkday')) {
        return { isSpa: true, platform: "Workday" };
    }

    // Greenhouse indicators
    if (lowerHtml.includes('greenhouse.io') || lowerHtml.includes('boards.greenhouse')) {
        return { isSpa: false, platform: "Greenhouse" }; // Greenhouse often has good HTML
    }

    // Lever indicators
    if (lowerHtml.includes('lever.co') || lowerHtml.includes('jobs.lever')) {
        return { isSpa: false, platform: "Lever" };
    }

    // Generic SPA indicators
    const hasReactRoot = $('#root, #app, [data-reactroot], #__next').length > 0;
    const hasMinimalContent = $('body').text().trim().length < 500;
    const hasJsFramework = lowerHtml.includes('react') || lowerHtml.includes('angular') || lowerHtml.includes('vue');

    if (hasReactRoot && hasMinimalContent) {
        return { isSpa: true, platform: undefined };
    }

    return { isSpa: false };
}

/**
 * Scrape jobs from an HTML page
 */
export function scrapeJobsFromHtml(html: string, baseUrl: string): ScrapeResult {
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];
    const allFields = new Set<string>();

    // First, try to extract jobs from JSON-LD structured data (most reliable)
    const jsonLdJobs = extractJobsFromJsonLd($, baseUrl);
    if (jsonLdJobs.length > 0) {
        jsonLdJobs.forEach(job => {
            jobs.push(job);
            Object.keys(job).forEach(k => {
                if (job[k]) allFields.add(k);
            });
        });

        return {
            jobs,
            fields: Array.from(allFields).sort(),
            feedType: "html",
            totalJobs: jobs.length,
        };
    }

    // Try to find job elements using various selectors
    let jobElements: CheerioSelection | null = null;

    for (const selector of JOB_LIST_SELECTORS) {
        if (selector === 'script[type="application/ld+json"]') continue; // Already handled above
        const elements = $(selector);
        if (elements.length > 0) {
            // Verify these look like job listings (have title-like content)
            const hasJobContent = elements.toArray().some(el => {
                const text = $(el).text().trim();
                return text.length > 10 && text.length < 5000;
            });
            if (hasJobContent) {
                jobElements = elements;
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

    // If no jobs found, check if this might be a JavaScript-rendered SPA
    const spaInfo = jobs.length === 0 ? detectSpaIndicators($, html) : { isSpa: false };

    return {
        jobs,
        fields: Array.from(allFields).sort(),
        feedType: "html",
        totalJobs: jobs.length,
        nextPageUrl,
        isSpa: spaInfo.isSpa,
        spaPlatform: spaInfo.platform,
    };
}

/**
 * Extract job fields from an element
 */
function extractFieldsFromElement(
    $: cheerio.CheerioAPI,
    $el: CheerioSelection,
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
 * Check if content is HTML (including XHTML pages that start with <?xml)
 */
export function isHtmlContent(content: string, contentType: string): boolean {
    const trimmed = content.trim().toLowerCase();

    // Check content-type header first
    if (contentType.includes('text/html')) {
        return true;
    }

    // Check for HTML doctype or html tag
    if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
        return true;
    }

    // Check if it's XHTML (starts with <?xml but contains <html>)
    // This handles pages that have XML declaration but are actually HTML
    if (trimmed.startsWith('<?xml')) {
        // Look for HTML indicators in the first 2000 chars
        const preview = trimmed.substring(0, 2000);
        if (preview.includes('<html') ||
            preview.includes('<!doctype html') ||
            preview.includes('<head') ||
            preview.includes('<body')) {
            return true;
        }
    }

    return false;
}

/**
 * Check if content is XML feed (RSS, Atom, or job feed XML)
 * This returns true only for actual feed XML, not XHTML pages
 */
export function isXmlContent(content: string, contentType: string): boolean {
    // First check if it's HTML (XHTML pages should be treated as HTML)
    if (isHtmlContent(content, contentType)) {
        return false;
    }

    const trimmed = content.trim().toLowerCase();

    // Check for XML feed content types
    if (contentType.includes('application/xml') ||
        contentType.includes('text/xml') ||
        contentType.includes('application/rss+xml') ||
        contentType.includes('application/atom+xml')) {
        return true;
    }

    // Check for XML declaration and feed-specific root elements
    if (trimmed.startsWith('<?xml')) {
        const preview = trimmed.substring(0, 2000);
        // Look for feed-specific root elements
        if (preview.includes('<rss') ||
            preview.includes('<feed') ||
            preview.includes('<source') ||
            preview.includes('<jobs') ||
            preview.includes('<jobpositionpostings')) {
            return true;
        }
        // If it starts with <?xml but doesn't have feed elements or HTML,
        // treat as XML and let the parser try
        if (!preview.includes('<html') && !preview.includes('<head') && !preview.includes('<body')) {
            return true;
        }
    }

    return false;
}

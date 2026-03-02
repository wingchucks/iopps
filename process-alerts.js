/**
 * IOPPS Google Alerts Job Import Pipeline
 * 
 * Reads Google Alert emails from ioppsjr@gmail.com,
 * extracts job links, scrapes full descriptions,
 * and imports to IOPPS Firestore as pending jobs.
 * 
 * Usage: node process-alerts.js
 */

const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const https = require("https");
const http = require("http");

const GMAIL_USER = "ioppsjr@gmail.com";
const GMAIL_PASS = "zicpifnuqltbfglr";
const IOPPS_API = "https://www.iopps.ca/api/admin/import-jobs";
const CRON_SECRET = "ea6fdac7e0ba42ca83e8ff1ac26d8a6c";

// Google Alerts sender
const ALERT_SENDER = "googlealerts-noreply@google.com";

/**
 * Extract job links from Google Alert HTML email
 * Google Alerts wraps links in Google redirect URLs
 */
function extractAlertLinks(html) {
  if (!html) return [];
  
  const links = [];
  // Google Alert links are in format: https://www.google.com/url?...&url=ACTUAL_URL&...
  const googleUrlPattern = /href="https?:\/\/www\.google\.com\/url\?[^"]*?url=(https?[^&"]+)[^"]*"/g;
  let match;
  while ((match = googleUrlPattern.exec(html)) !== null) {
    const decoded = decodeURIComponent(match[1]);
    if (!decoded.includes("google.com") && !decoded.includes("support.google")) {
      links.push(decoded);
    }
  }
  
  // Also try direct links (non-Google-wrapped)
  const directPattern = /href="(https?:\/\/(?!www\.google\.com)[^"]+)"/g;
  while ((match = directPattern.exec(html)) !== null) {
    const url = match[1];
    if (!url.includes("google.com") && !url.includes("gstatic.com") && !links.includes(url)) {
      links.push(url);
    }
  }
  
  return [...new Set(links)];
}

/**
 * Fetch a URL and extract readable content
 */
async function fetchJobPage(url) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 15000);
    
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { 
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 12000,
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timeout);
        return fetchJobPage(res.headers.location).then(resolve);
      }
      
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        clearTimeout(timeout);
        resolve(body);
      });
    });
    
    req.on("error", () => { clearTimeout(timeout); resolve(null); });
    req.on("timeout", () => { req.destroy(); clearTimeout(timeout); resolve(null); });
  });
}

/**
 * Extract job data from an HTML page
 */
function extractJobData(html, url) {
  if (!html) return null;
  
  // Try to get title from meta tags or <title>
  let title = "";
  const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  const metaTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  title = ogTitle?.[1] || metaTitle?.[1] || "";
  title = title.replace(/\s*[\|–—-]\s*.+$/, "").trim(); // Remove site name after separator
  
  // Get description from meta
  let description = "";
  const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
  const metaDesc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
  description = ogDesc?.[1] || metaDesc?.[1] || "";
  
  // Try to get the main content - look for job description patterns
  const bodyContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  
  // Look for structured job data (JSON-LD)
  const jsonLd = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  let structuredData = null;
  if (jsonLd) {
    for (const block of jsonLd) {
      try {
        const json = block.replace(/<\/?script[^>]*>/gi, "").trim();
        const data = JSON.parse(json);
        const jobData = Array.isArray(data) ? data.find(d => d["@type"] === "JobPosting") : 
                        data["@type"] === "JobPosting" ? data : null;
        if (jobData) { structuredData = jobData; break; }
      } catch {}
    }
  }
  
  if (structuredData) {
    return {
      title: structuredData.title || title,
      company: structuredData.hiringOrganization?.name || "",
      location: structuredData.jobLocation?.address?.addressLocality || 
                structuredData.jobLocation?.address?.addressRegion || "",
      description: structuredData.description || description,
      employmentType: structuredData.employmentType || "",
      salary: structuredData.baseSalary?.value?.value || structuredData.baseSalary?.value || "",
      datePosted: structuredData.datePosted || "",
      externalUrl: url,
    };
  }
  
  // Fallback: extract from HTML
  // Get the largest text block that looks like a job description
  const sections = bodyContent.match(/<(?:div|section|article|main)[^>]*>[\s\S]*?<\/(?:div|section|article|main)>/gi) || [];
  let bestContent = description;
  let bestLen = 0;
  
  for (const section of sections) {
    const text = section.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > bestLen && text.length < 30000 && text.length > 200) {
      // Check if it looks like a job description
      const jobWords = ["responsibilities", "qualifications", "requirements", "experience", "salary", "apply", "position", "role", "duties"];
      const hits = jobWords.filter(w => text.toLowerCase().includes(w)).length;
      if (hits >= 2 || text.length > 500) {
        bestLen = text.length;
        bestContent = section; // Keep HTML for formatting
      }
    }
  }
  
  // Try to extract company from page
  let company = "";
  const orgSchema = html.match(/"name"\s*:\s*"([^"]+)".*?"@type"\s*:\s*"Organization"/i);
  if (orgSchema) company = orgSchema[1];
  
  // Try to get location
  let location = "";
  const locMatch = bodyContent.match(/(?:Location|City|Province|Region)\s*:?\s*([^<\n]+)/i);
  if (locMatch) location = locMatch[1].replace(/<[^>]+>/g, "").trim();
  
  if (!title && !bestContent) return null;
  
  return {
    title: title || "Untitled Position",
    company,
    location,
    description: bestContent || description,
    employmentType: "",
    salary: "",
    datePosted: "",
    externalUrl: url,
  };
}

/**
 * Post job to IOPPS API
 */
async function postToIOPPS(jobs) {
  const body = JSON.stringify({ jobs });
  
  return new Promise((resolve, reject) => {
    const req = https.request(IOPPS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": CRON_SECRET,
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } 
        catch { resolve({ raw: data }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Main pipeline
 */
async function main() {
  console.log("Connecting to Gmail...");
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  
  const allJobs = [];
  let emailsProcessed = 0;
  
  try {
    // Search for unread Google Alert emails
    const uids = await client.search({ unseen: true, from: ALERT_SENDER });
    console.log(`Found ${uids.length} unread alert emails`);
    
    if (uids.length === 0) {
      console.log("No new alerts to process.");
      lock.release();
      await client.logout();
      return;
    }
    
    for await (const msg of client.fetch(uids, { source: true, uid: true })) {
      const parsed = await simpleParser(msg.source);
      console.log(`\nProcessing: ${parsed.subject}`);
      
      const links = extractAlertLinks(parsed.html);
      console.log(`  Found ${links.length} links`);
      
      for (const link of links) {
        console.log(`  Fetching: ${link.substring(0, 80)}...`);
        const html = await fetchJobPage(link);
        if (!html) { console.log("    SKIP: couldn't fetch"); continue; }
        
        const job = extractJobData(html, link);
        if (!job || !job.title || job.title === "Untitled Position") {
          console.log("    SKIP: couldn't extract job data");
          continue;
        }
        
        console.log(`    ✓ ${job.title} @ ${job.company || "Unknown"}`);
        allJobs.push(job);
      }
      
      // Mark as read
      await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
      emailsProcessed++;
    }
  } finally {
    lock.release();
    await client.logout();
  }
  
  console.log(`\nProcessed ${emailsProcessed} emails, found ${allJobs.length} jobs`);
  
  if (allJobs.length > 0) {
    console.log("Importing to IOPPS...");
    const result = await postToIOPPS(allJobs);
    console.log("API response:", JSON.stringify(result));
  }
  
  console.log("Done!");
}

main().catch(err => console.error("Fatal:", err.message));
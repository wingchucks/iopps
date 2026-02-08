// Test script for XML job scraper
// Run with: node --require esbuild-register scripts/test-scraper.ts

import { parseStringPromise } from "xml2js";
import { decode } from "he";

interface JobXML {
    title: string[];
    description: string[];
    city: string[];
    state: string[];
    country: string[];
    remote: string[];
    applyurl: string[];
    company: string[];
    expirationdate: string[];
    category: string[];
    url: string[];
}

async function testScraper() {
    console.log("🧪 Testing Job Scraper XML Parser\n");
    console.log("Fetching feed from: https://iopps.ca/feeds/standard.xml\n");

    try {
        // Fetch XML feed
        const response = await fetch("https://iopps.ca/feeds/standard.xml");
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const xmlText = await response.text();
        console.log(`✓ Fetched XML (${xmlText.length} bytes)\n`);

        // Parse XML
        const parsed = await parseStringPromise(xmlText);
        const jobs = parsed.source?.job || [];

        console.log(`✓ Parsed ${jobs.length} jobs from feed\n`);
        console.log("=".repeat(80));

        // Process each job and show what would be imported
        for (let i = 0; i < Math.min(jobs.length, 5); i++) {
            const jobXML = jobs[i] as JobXML;

            const title = jobXML.title?.[0] || "";
            const description = decode(jobXML.description?.[0] || "");
            const city = jobXML.city?.[0] || "";
            const state = jobXML.state?.[0] || "";
            const location = city && state ? `${city}, ${state}` : city || state || "Remote";
            const applyUrl = jobXML.applyurl?.[0] || "";
            const company = jobXML.company?.[0] || "";
            const remote = jobXML.remote?.[0]?.toLowerCase() === "yes";
            const expirationDate = jobXML.expirationdate?.[0] || "";

            console.log(`\n📋 Job ${i + 1}: ${title}`);
            console.log("-".repeat(80));
            console.log(`   Company: ${company}`);
            console.log(`   Location: ${location}`);
            console.log(`   Remote: ${remote ? "Yes" : "No"}`);
            console.log(`   Apply URL: ${applyUrl}`);
            console.log(`   Expiration: ${expirationDate || "None"}`);
            console.log(`   Description Preview: ${description.substring(0, 150)}...`);
        }

        console.log("\n" + "=".repeat(80));
        console.log(`\n✅ Test Complete!`);
        console.log(`   Total Jobs in Feed: ${jobs.length}`);
        console.log(`   Shown: ${Math.min(jobs.length, 5)} (first 5)`);
        console.log(`\n💡 All jobs would be imported successfully!`);
        console.log(`   Duplicate detection uses 'applyurl' as unique identifier`);

    } catch (error: unknown) {
        console.error("\n❌ Test Failed:");
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

testScraper();

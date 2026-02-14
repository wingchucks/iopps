/**
 * Job Description Parser
 *
 * Intelligently parses job descriptions from RSS feeds to extract
 * structured data like requirements, benefits, and qualifications.
 */

export interface ParsedJobDescription {
  description: string;         // HTML-preserved description for rendering
  plainDescription: string;    // Plain text version (HTML stripped)
  requirements?: string;
  benefits?: string;
  qualifications?: string[];
  responsibilities?: string[];
}

export interface ParsedSalary {
  display: string;
  min?: number;
  max?: number;
  currency?: string;
  period?: "hourly" | "annual" | "monthly" | "weekly";
}

// Section header patterns for extraction
const SECTION_PATTERNS = {
  requirements: [
    /(?:^|\n)\s*(?:requirements?|what you(?:'ll)? need|must have|required|minimum qualifications?|key requirements?|essential requirements?|what we(?:'re)? looking for)\s*:?\s*\n/i,
    /(?:^|\n)\s*(?:##?\s*)?requirements?\s*$/im,
  ],
  benefits: [
    /(?:^|\n)\s*(?:benefits?|what we offer|perks?|we offer|our benefits?|compensation(?: and benefits)?|why join us|what's in it for you)\s*:?\s*\n/i,
    /(?:^|\n)\s*(?:##?\s*)?benefits?\s*$/im,
  ],
  qualifications: [
    /(?:^|\n)\s*(?:qualifications?|ideal candidate|preferred qualifications?|nice to have|desired skills?|preferred skills?)\s*:?\s*\n/i,
    /(?:^|\n)\s*(?:##?\s*)?qualifications?\s*$/im,
  ],
  responsibilities: [
    /(?:^|\n)\s*(?:responsibilities?|duties|what you(?:'ll)? do|key responsibilities?|your role|about the role|job duties|the role)\s*:?\s*\n/i,
    /(?:^|\n)\s*(?:##?\s*)?responsibilities?\s*$/im,
  ],
};

// Next section markers to know when a section ends
const NEXT_SECTION_MARKERS = [
  /(?:^|\n)\s*(?:requirements?|benefits?|qualifications?|responsibilities?|about (?:us|the company)|how to apply|apply now|salary|compensation|location|who we are|about this role)\s*:?\s*$/im,
  /(?:^|\n)\s*(?:##?\s*)(?:requirements?|benefits?|qualifications?|responsibilities?|about|apply)/im,
];

/**
 * Clean up HTML and normalize whitespace in text (strips HTML tags)
 */
export function cleanText(text: string): string {
  if (!text) return "";

  return text
    // Remove HTML tags but preserve line breaks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    // Normalize whitespace
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Preserve HTML but decode entities and sanitize basic structure
 * This keeps HTML tags intact for proper rendering with dangerouslySetInnerHTML
 */
export function preserveHtml(text: string): string {
  if (!text) return "";

  return text
    // Decode HTML entities that might be double-encoded
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    // Decode HTML tags that were encoded as entities (double-encoded)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Normalize whitespace between tags
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

/**
 * Extract a section from the description based on header patterns
 */
function extractSection(text: string, patterns: RegExp[]): { content: string; startIndex: number; endIndex: number } | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const startIndex = match.index + match[0].length;

      // Find where this section ends (next section header or end of text)
      let endIndex = text.length;
      for (const endPattern of NEXT_SECTION_MARKERS) {
        const endMatch = endPattern.exec(text.slice(startIndex));
        if (endMatch && endMatch.index > 0) {
          endIndex = Math.min(endIndex, startIndex + endMatch.index);
        }
      }

      const content = text.slice(startIndex, endIndex).trim();
      if (content.length > 10) { // Minimum content length
        return { content, startIndex: match.index, endIndex };
      }
    }
  }
  return null;
}

/**
 * Convert bullet-pointed or numbered text to an array of items
 */
function textToArray(text: string): string[] {
  const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);
  const items: string[] = [];

  for (const line of lines) {
    // Remove common bullet points and numbering
    const cleaned = line
      .replace(/^[\s•\-\*\+○●◦▪▸►→]\s*/g, "")
      .replace(/^\d+[\.\)]\s*/g, "")
      .replace(/^[a-z][\.\)]\s*/i, "")
      .trim();

    if (cleaned.length > 5) { // Minimum item length
      items.push(cleaned);
    }
  }

  return items;
}

/**
 * Parse a complete job description into structured fields
 */
export function parseJobDescription(rawDescription: string): ParsedJobDescription {
  const plainText = cleanText(rawDescription);
  const htmlText = preserveHtml(rawDescription);

  const result: ParsedJobDescription = {
    description: htmlText,           // Preserve HTML for rendering
    plainDescription: plainText,     // Plain text for section extraction
  };

  // Track what parts we've extracted so we can remove them from main description
  const extractedRanges: Array<{ start: number; end: number }> = [];

  // Extract requirements (using plain text for pattern matching)
  const requirementsSection = extractSection(plainText, SECTION_PATTERNS.requirements);
  if (requirementsSection) {
    result.requirements = requirementsSection.content;
    extractedRanges.push({ start: requirementsSection.startIndex, end: requirementsSection.endIndex });
  }

  // Extract benefits
  const benefitsSection = extractSection(plainText, SECTION_PATTERNS.benefits);
  if (benefitsSection) {
    result.benefits = benefitsSection.content;
    extractedRanges.push({ start: benefitsSection.startIndex, end: benefitsSection.endIndex });
  }

  // Extract qualifications as array
  const qualificationsSection = extractSection(plainText, SECTION_PATTERNS.qualifications);
  if (qualificationsSection) {
    const items = textToArray(qualificationsSection.content);
    if (items.length > 0) {
      result.qualifications = items;
    }
    extractedRanges.push({ start: qualificationsSection.startIndex, end: qualificationsSection.endIndex });
  }

  // Extract responsibilities as array
  const responsibilitiesSection = extractSection(plainText, SECTION_PATTERNS.responsibilities);
  if (responsibilitiesSection) {
    const items = textToArray(responsibilitiesSection.content);
    if (items.length > 0) {
      result.responsibilities = items;
    }
    extractedRanges.push({ start: responsibilitiesSection.startIndex, end: responsibilitiesSection.endIndex });
  }

  return result;
}

/**
 * Parse a salary string into structured data
 */
export function parseSalary(salaryString: string): ParsedSalary | null {
  if (!salaryString || salaryString.trim().length === 0) {
    return null;
  }

  const text = salaryString.trim();
  const result: ParsedSalary = { display: text };

  // Detect currency
  if (text.includes("$") || text.toLowerCase().includes("cad") || text.toLowerCase().includes("usd")) {
    result.currency = text.toLowerCase().includes("usd") ? "USD" : "CAD";
  } else if (text.includes("€")) {
    result.currency = "EUR";
  } else if (text.includes("£")) {
    result.currency = "GBP";
  }

  // Detect period
  const lowerText = text.toLowerCase();
  if (lowerText.includes("/hr") || lowerText.includes("per hour") || lowerText.includes("/hour") || lowerText.includes("hourly")) {
    result.period = "hourly";
  } else if (lowerText.includes("/yr") || lowerText.includes("per year") || lowerText.includes("/year") || lowerText.includes("annual") || lowerText.includes("yearly")) {
    result.period = "annual";
  } else if (lowerText.includes("/mo") || lowerText.includes("per month") || lowerText.includes("/month") || lowerText.includes("monthly")) {
    result.period = "monthly";
  } else if (lowerText.includes("/wk") || lowerText.includes("per week") || lowerText.includes("/week") || lowerText.includes("weekly")) {
    result.period = "weekly";
  }

  // Extract numeric values - look for patterns like "$50,000 - $70,000" or "$50K-70K"
  const rangePattern = /\$?\s*([\d,]+(?:\.\d+)?)\s*[kK]?\s*(?:[-–—to]+)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*[kK]?/;
  const singlePattern = /\$\s*([\d,]+(?:\.\d+)?)\s*[kK]?/;

  const rangeMatch = text.match(rangePattern);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1].replace(/,/g, ""));
    let max = parseFloat(rangeMatch[2].replace(/,/g, ""));

    // Handle K notation
    if (text.toLowerCase().includes("k") && min < 1000) {
      min *= 1000;
      max *= 1000;
    }

    result.min = min;
    result.max = max;

    // Default to annual if we have large numbers and no period specified
    if (!result.period && min > 1000) {
      result.period = "annual";
    }
  } else {
    const singleMatch = text.match(singlePattern);
    if (singleMatch) {
      let value = parseFloat(singleMatch[1].replace(/,/g, ""));

      // Handle K notation
      if (text.toLowerCase().includes("k") && value < 1000) {
        value *= 1000;
      }

      // Determine if this is min or max based on context
      if (lowerText.includes("up to") || lowerText.includes("max")) {
        result.max = value;
      } else if (lowerText.includes("from") || lowerText.includes("starting") || lowerText.includes("min")) {
        result.min = value;
      } else {
        // Single value - treat as the expected salary
        result.min = value;
        result.max = value;
      }

      // Default to annual if we have large numbers
      if (!result.period && value > 1000) {
        result.period = "annual";
      }
    }
  }

  return result;
}

/**
 * Try to extract location from description text as a fallback
 */
export function extractLocationFromDescription(description: string): string | null {
  if (!description) return null;

  const text = cleanText(description);

  // Common Canadian provinces and territories
  const provinces = [
    "Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba",
    "Saskatchewan", "Nova Scotia", "New Brunswick", "Newfoundland",
    "Prince Edward Island", "Northwest Territories", "Yukon", "Nunavut",
    "ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "NT", "YT", "NU"
  ];

  // Common location patterns
  const patterns = [
    /(?:location|based in|located in|office in|position in)\s*:?\s*([^,\n\.]+(?:,\s*[^,\n\.]+)?)/i,
    /(?:^|\n)\s*(?:📍|🗺️|Location:)\s*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const location = match[1].trim();
      if (location.length > 2 && location.length < 100) {
        return location;
      }
    }
  }

  // Look for city, province patterns
  const cityProvincePattern = new RegExp(
    `([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?),?\\s*(${provinces.join("|")})`,
    "i"
  );
  const cityMatch = cityProvincePattern.exec(text);
  if (cityMatch) {
    return `${cityMatch[1]}, ${cityMatch[2]}`;
  }

  return null;
}

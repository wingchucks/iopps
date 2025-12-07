import { GoogleGenerativeAI } from "@google/generative-ai";

// Types
export type JobDescriptionInput = {
  title: string;
  location?: string;
  employmentType?: string;
  salaryRange?: string;
  organizationName?: string;
  department?: string;
  keyDuties?: string;
  indigenousCommitments?: string;
};

export type JobDescriptionOutput = {
  description: string;
  responsibilities: string[];
  qualifications: string[];
};

// Types for poster/flyer analysis
export type PosterAnalysisType = "powwow" | "conference" | "scholarship";

export type PowwowExtractedData = {
  name: string;
  host?: string;
  location: string;
  startDate?: string;
  endDate?: string;
  dateRange?: string;
  description: string;
  registrationStatus?: string;
  livestream?: boolean;
  contactInfo?: string;
  website?: string;
};

export type ConferenceExtractedData = {
  title: string;
  organizerName?: string;
  description: string;
  location: string;
  startDate?: string;
  endDate?: string;
  registrationUrl?: string;
  cost?: string;
  format?: string;
  contactInfo?: string;
  speakers?: string[];
  topics?: string[];
};

export type ScholarshipExtractedData = {
  title: string;
  provider: string;
  description: string;
  amount?: string;
  deadline?: string;
  level: string;
  region?: string;
  type: string;
  eligibility?: string[];
  applicationUrl?: string;
  contactInfo?: string;
};

export type PosterAnalysisResult = {
  type: PosterAnalysisType;
  confidence: number;
  data: PowwowExtractedData | ConferenceExtractedData | ScholarshipExtractedData;
  rawText?: string;
};

// Initialize Google AI (only if API key is available)
const genAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

/**
 * Generate a job description using Google AI
 * @param input Job details to generate description from
 * @returns Generated job description, responsibilities, and qualifications
 */
export async function generateJobDescription(
  input: JobDescriptionInput
): Promise<JobDescriptionOutput> {
  // Stub: Return placeholder data if AI is not configured
  if (!genAI || !process.env.GOOGLE_AI_API_KEY) {
    console.warn("Google AI not configured, returning placeholder data");
    return {
      description:
        "This is a placeholder job description. Configure your Google AI API key to generate real descriptions.",
      responsibilities: [
        "Placeholder responsibility 1",
        "Placeholder responsibility 2",
        "Placeholder responsibility 3",
      ],
      qualifications: [
        "Placeholder qualification 1",
        "Placeholder qualification 2",
        "Placeholder qualification 3",
      ],
    };
  }

  // Build the prompt
  const prompt = `You are an expert job description writer for IOPPS (Indigenous Opportunities Portal & Professional Services), a platform connecting Indigenous talent with meaningful employment opportunities. Write a professional, engaging job description that:

1. Honors Indigenous perspectives and cultural values
2. Uses inclusive, welcoming language
3. Emphasizes community impact and reconciliation
4. Highlights opportunities for Indigenous candidates
5. Maintains a respectful, professional tone

Job Details:
- Title: ${input.title}
${input.location ? `- Location: ${input.location}` : ""}
${input.employmentType ? `- Employment Type: ${input.employmentType}` : ""}
${input.salaryRange ? `- Salary Range: ${input.salaryRange}` : ""}
${input.organizationName ? `- Organization: ${input.organizationName}` : ""}
${input.department ? `- Department: ${input.department}` : ""}
${input.keyDuties ? `- Key Duties: ${input.keyDuties}` : ""}
${input.indigenousCommitments ? `- Indigenous Commitments: ${input.indigenousCommitments}` : ""}

Generate:
1. A compelling job description (2-3 paragraphs)
2. A list of 5-8 key responsibilities
3. A list of 5-8 qualifications/requirements

Format your response as JSON with this structure:
{
  "description": "...",
  "responsibilities": ["...", "..."],
  "qualifications": ["...", "..."]
}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Gemini response");
    }

    const parsedResult = JSON.parse(jsonMatch[0]);

    return {
      description: parsedResult.description,
      responsibilities: parsedResult.responsibilities,
      qualifications: parsedResult.qualifications,
    };
  } catch (error) {
    console.error("Error generating job description:", error);
    throw error;
  }
}

/**
 * Analyze a poster/flyer image and extract event information
 * @param imageBase64 Base64-encoded image data
 * @param mimeType Image MIME type (e.g., "image/jpeg", "image/png")
 * @param eventType Type of event to extract (powwow, conference, scholarship)
 * @returns Extracted event data
 */
export async function analyzePosterImage(
  imageBase64: string,
  mimeType: string,
  eventType: PosterAnalysisType
): Promise<PosterAnalysisResult> {
  // Return placeholder if AI is not configured
  if (!genAI || !process.env.GOOGLE_AI_API_KEY) {
    console.warn("Google AI not configured, returning placeholder data");
    return getPlaceholderResult(eventType);
  }

  const prompts: Record<PosterAnalysisType, string> = {
    powwow: `You are an expert at reading and extracting information from Pow Wow event posters and flyers. Analyze this image and extract all relevant information.

Extract the following information if available:
- Event name/title
- Host organization or nation
- Location (venue, city, province/state)
- Start date (format: YYYY-MM-DD if possible)
- End date (format: YYYY-MM-DD if possible)
- Date range description (e.g., "June 15-17, 2024")
- Description of the event
- Registration status (open, closed, required, etc.)
- Whether there is a livestream
- Contact information
- Website URL

Return ONLY a valid JSON object with this structure:
{
  "name": "Event Name",
  "host": "Host Organization",
  "location": "Full Location",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "dateRange": "Human readable date range",
  "description": "Event description",
  "registrationStatus": "open/closed/required",
  "livestream": true/false,
  "contactInfo": "Contact details",
  "website": "URL"
}`,

    conference: `You are an expert at reading and extracting information from conference and event posters. Analyze this image and extract all relevant information.

Extract the following information if available:
- Conference/event title
- Organizer name
- Description/theme
- Location (venue, city, country)
- Start date (format: YYYY-MM-DD if possible)
- End date (format: YYYY-MM-DD if possible)
- Registration URL
- Cost/pricing
- Format (in-person, virtual, hybrid)
- Contact information
- Featured speakers
- Main topics/themes

Return ONLY a valid JSON object with this structure:
{
  "title": "Conference Title",
  "organizerName": "Organizer",
  "description": "Conference description",
  "location": "Full Location",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "registrationUrl": "URL",
  "cost": "Price or Free",
  "format": "in-person/virtual/hybrid",
  "contactInfo": "Contact details",
  "speakers": ["Speaker 1", "Speaker 2"],
  "topics": ["Topic 1", "Topic 2"]
}`,

    scholarship: `You are an expert at reading and extracting information from scholarship and grant posters/flyers. Analyze this image and extract all relevant information.

Extract the following information if available:
- Scholarship/grant title
- Provider/organization name
- Description
- Award amount
- Application deadline (format: YYYY-MM-DD if possible)
- Education level (high school, undergraduate, graduate, etc.)
- Region/eligibility area
- Type (merit, need-based, Indigenous-specific, etc.)
- Eligibility requirements
- Application URL
- Contact information

Return ONLY a valid JSON object with this structure:
{
  "title": "Scholarship Name",
  "provider": "Provider Organization",
  "description": "Scholarship description",
  "amount": "$X,XXX or range",
  "deadline": "YYYY-MM-DD or null",
  "level": "undergraduate/graduate/etc",
  "region": "Geographic area",
  "type": "merit/need-based/Indigenous/etc",
  "eligibility": ["Requirement 1", "Requirement 2"],
  "applicationUrl": "URL",
  "contactInfo": "Contact details"
}`
  };

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const result = await model.generateContent([
      prompts[eventType],
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from AI response");
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    return {
      type: eventType,
      confidence: 0.85, // Default confidence score
      data: parsedData,
      rawText: text,
    };
  } catch (error) {
    console.error("Error analyzing poster image:", error);
    throw error;
  }
}

/**
 * Get placeholder result for when AI is not configured
 */
function getPlaceholderResult(eventType: PosterAnalysisType): PosterAnalysisResult {
  const placeholders: Record<PosterAnalysisType, PosterAnalysisResult> = {
    powwow: {
      type: "powwow",
      confidence: 0,
      data: {
        name: "Unable to analyze - AI not configured",
        location: "",
        description: "Please configure Google AI API key to enable poster analysis.",
      } as PowwowExtractedData,
    },
    conference: {
      type: "conference",
      confidence: 0,
      data: {
        title: "Unable to analyze - AI not configured",
        description: "Please configure Google AI API key to enable poster analysis.",
        location: "",
      } as ConferenceExtractedData,
    },
    scholarship: {
      type: "scholarship",
      confidence: 0,
      data: {
        title: "Unable to analyze - AI not configured",
        provider: "",
        description: "Please configure Google AI API key to enable poster analysis.",
        level: "",
        type: "",
      } as ScholarshipExtractedData,
    },
  };

  return placeholders[eventType];
}

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

export type JobSearchInput = {
  query: string;
  location?: string;
  employmentType?: string;
  skills?: string[];
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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
 * Help with job search using Google AI
 * @param input Search query and filters
 * @returns AI-generated search suggestions
 */
export async function helpJobSearch(
  input: JobSearchInput
): Promise<{ suggestions: string[]; matchingSkills: string[] }> {
  // Stub: Return placeholder data
  console.warn("Job search AI helper not yet implemented");
  return {
    suggestions: [
      "Try searching for: " + input.query,
      "Consider expanding your search to nearby locations",
      "Look for similar job titles",
    ],
    matchingSkills: input.skills || [],
  };
}

/**
 * Generate application assistance using Google AI
 * @param jobTitle The job title
 * @param userExperience Brief description of user's experience
 * @returns AI-generated cover letter tips
 */
export async function generateApplicationTips(
  jobTitle: string,
  userExperience?: string
): Promise<{ tips: string[]; suggestedHighlights: string[] }> {
  // Stub: Return placeholder data
  console.warn("Application tips AI helper not yet implemented");
  return {
    tips: [
      "Tailor your application to highlight Indigenous community engagement",
      "Emphasize relevant cultural competencies",
      "Include specific examples of your experience",
    ],
    suggestedHighlights: [
      "Community involvement",
      "Cultural awareness",
      "Relevant technical skills",
    ],
  };
}

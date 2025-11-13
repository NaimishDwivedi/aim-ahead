"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use one of these supported models instead:
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
// OR
// const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export const generateAIInsights = async (industry) => {
  // Add error handling for the API call
  try {
    const prompt = `
      Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
      {
        "salaryRanges": [
          { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
        ],
        "growthRate": number,
        "demandLevel": "High" | "Medium" | "Low",
        "topSkills": ["skill1", "skill2"],
        "marketOutlook": "Positive" | "Neutral" | "Negative",
        "keyTrends": ["trend1", "trend2"],
        "recommendedSkills": ["skill1", "skill2"]
      }
      
      IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
      Include at least 5 common roles for salary ranges.
      Growth rate should be a percentage.
      Include at least 5 skills and trends.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("AI Insight generation failed:", error.message);

    // Return fallback data so the onboarding doesn't fail
    return getFallbackInsights(industry);
  }
};

// Fallback function in case AI fails
function getFallbackInsights(industry) {
  return {
    salaryRanges: [
      {
        role: "Entry-level",
        min: 40000,
        max: 60000,
        median: 50000,
        location: "National Average",
      },
      {
        role: "Mid-level",
        min: 60000,
        max: 90000,
        median: 75000,
        location: "National Average",
      },
      {
        role: "Senior-level",
        min: 80000,
        max: 120000,
        median: 100000,
        location: "National Average",
      },
    ],
    growthRate: 5,
    demandLevel: "Medium",
    topSkills: ["Communication", "Problem Solving", "Teamwork"],
    marketOutlook: "Positive",
    keyTrends: ["Digital Transformation", "Remote Work"],
    recommendedSkills: ["Technical Skills", "Leadership"],
  };
}

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // If no insights exist, generate them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return industryInsight;
  }

  return user.industryInsight;
}

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use a supported model instead of gemini-1.5-flash
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
// OR use: const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Write a professional cover letter for a ${data.jobTitle} position at ${
    data.companyName
  }.
    
    About the candidate:
    - Industry: ${user.industry}
    - Years of Experience: ${user.experience}
    - Skills: ${user.skills?.join(", ")}
    - Professional Background: ${user.bio}
    
    Job Description:
    ${data.jobDescription}
    
    Requirements:
    1. Use a professional, enthusiastic tone
    2. Highlight relevant skills and experience
    3. Show understanding of the company's needs
    4. Keep it concise (max 400 words)
    5. Use proper business letter formatting in markdown
    6. Include specific examples of achievements
    7. Relate candidate's background to job requirements
    
    Format the letter in markdown.
  `;

  try {
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    return coverLetter;
  } catch (error) {
    console.error("Error generating cover letter:", error.message);

    // Generate a fallback cover letter if AI fails
    const fallbackContent = generateFallbackCoverLetter(data, user);

    const coverLetter = await db.coverLetter.create({
      data: {
        content: fallbackContent,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    return coverLetter;
  }
}

// Fallback cover letter generator
function generateFallbackCoverLetter(data, user) {
  return `
# Cover Letter

**Applicant:** ${user.name || "Candidate"}  
**Position:** ${data.jobTitle}  
**Company:** ${data.companyName}  
**Date:** ${new Date().toLocaleDateString()}

Dear Hiring Manager,

I am writing to express my enthusiastic interest in the ${
    data.jobTitle
  } position at ${data.companyName}. With ${
    user.experience || "several"
  } years of experience in the ${
    user.industry
  } industry, I am confident that my skills and background align well with your requirements.

## Professional Background

${
  user.bio ||
  `As a dedicated ${
    user.industry
  } professional, I have developed strong expertise in ${
    user.skills?.join(", ") || "key industry skills"
  }. My experience has equipped me with the technical knowledge and practical abilities to excel in challenging environments.`
}

## Key Qualifications

- **Industry Experience:** ${user.experience || "Proven track record"} in ${
    user.industry
  }
- **Technical Skills:** ${
    user.skills?.join(", ") || "Relevant professional capabilities"
  }
- **Professional Approach:** Results-oriented with strong problem-solving abilities

## Why I'm a Strong Candidate

I am particularly drawn to this opportunity at ${data.companyName} because of ${
    data.jobDescription
      ? "the alignment between your needs and my qualifications"
      : "the potential to contribute to your team"
  }. My background in ${
    user.industry
  } has prepared me to tackle complex challenges and deliver measurable results.

I am eager to bring my expertise in ${
    user.skills?.[0] || user.industry
  } to your organization and contribute to your team's success. I am confident that my combination of technical skills and industry knowledge would make me a valuable asset to ${
    data.companyName
  }.

Thank you for considering my application. I look forward to the opportunity to discuss how my experience and skills can benefit your organization.

Sincerely,  
${user.name || "Candidate"}  
${user.email || ""}
  `.trim();
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    return await db.coverLetter.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Error fetching cover letters:", error.message);
    throw new Error("Failed to fetch cover letters");
  }
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    return await db.coverLetter.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Error fetching cover letter:", error.message);
    throw new Error("Failed to fetch cover letter");
  }
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    return await db.coverLetter.delete({
      where: {
        id,
        userId: user.id,
      },
    });
  } catch (error) {
    console.error("Error deleting cover letter:", error.message);
    throw new Error("Failed to delete cover letter");
  }
}

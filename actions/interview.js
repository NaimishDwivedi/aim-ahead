"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use a supported model instead of gemini-1.5-flash
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
// OR use: const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Generate 10 technical interview questions for a ${
      user.industry
    } professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.
    
    Each question should be multiple choice with 4 options.
    
    Return the response in this JSON format only, no additional text:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);

    // Return fallback quiz questions if AI generation fails
    return getFallbackQuizQuestions(user.industry, user.skills);
  }
}

// Fallback quiz questions in case AI fails
function getFallbackQuizQuestions(industry, skills) {
  const baseQuestions = [
    {
      question: `What is a key concept in ${industry} that every professional should understand?`,
      options: [
        "Project Management",
        "Technical Documentation",
        "Stakeholder Communication",
        "All of the above",
      ],
      correctAnswer: "All of the above",
      explanation:
        "All these concepts are fundamental across most industries and roles.",
    },
    {
      question: `Which skill is most important for problem-solving in ${industry}?`,
      options: ["Memorization", "Critical Thinking", "Speed", "Intuition"],
      correctAnswer: "Critical Thinking",
      explanation:
        "Critical thinking allows you to analyze problems systematically and develop effective solutions.",
    },
    {
      question:
        "What is the best approach when facing a technical challenge you don't immediately understand?",
      options: [
        "Guess and proceed",
        "Ask for help immediately",
        "Break it down into smaller parts",
        "Ignore it and move on",
      ],
      correctAnswer: "Break it down into smaller parts",
      explanation:
        "Breaking complex problems into manageable parts makes them easier to solve systematically.",
    },
  ];

  // Add more questions based on specific skills if available
  if (skills && skills.length > 0) {
    skills.forEach((skill) => {
      baseQuestions.push({
        question: `How would you demonstrate proficiency in ${skill} during an interview?`,
        options: [
          "List certifications",
          "Describe a relevant project",
          "Explain key concepts",
          "All of the above",
        ],
        correctAnswer: "All of the above",
        explanation:
          "Combining certifications, practical examples, and conceptual understanding provides the most comprehensive demonstration of skill.",
      });
    });
  }

  // Ensure we return exactly 10 questions by duplicating if necessary
  while (baseQuestions.length < 10) {
    baseQuestions.push(...baseQuestions.slice(0, 10 - baseQuestions.length));
  }

  return baseQuestions.slice(0, 10);
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Use a generic improvement tip if AI generation fails
      improvementTip = `Focus on strengthening your core ${user.industry} knowledge and practice explaining technical concepts clearly. Review fundamental principles and stay updated with industry trends.`;
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}

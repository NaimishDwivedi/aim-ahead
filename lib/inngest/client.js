import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "aicareermentor",
  name: "aicareermentor",
  credentials: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
  },
});

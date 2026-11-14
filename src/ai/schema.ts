import { Schema } from "firebase/ai";

const FLAG_CATEGORIES = ["name", "id", "phone", "email", "address", "dob", "account", "other"] as const;

export const extractionSchema = Schema.object({
  properties: {
    transcript: Schema.string({
      description: "Plain transcription of the page, with line breaks.",
    }),
    uncertain: Schema.boolean({
      description: "True if any part of the page was hard to read.",
    }),
    flags: Schema.array({
      description: "Personal details copied exactly from the transcript.",
      items: Schema.object({
        properties: {
          text: Schema.string({
            description: "Exact substring of the transcript.",
          }),
          category: Schema.enumString({
            description: "Kind of personal detail.",
            enum: [...FLAG_CATEGORIES],
          }),
        },
      }),
    }),
  },
});

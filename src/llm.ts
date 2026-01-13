"server-only";

import { getAllEmails } from "@/app/persistance";
import { getEnv } from "@/src/env";
import { logger } from "@/src/logger";
import { searchWithEmbeddings } from "@/src/search";
import type { MyUIMessage } from "@/src/types";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  generateText,
  Output,
  stepCountIs,
  tool,
  ToolLoopAgent
} from "ai";
import z from "zod";

const llmProvider = createAnthropic({
  apiKey: getEnv().ANTHROPIC_API_KEY
});

export function createAgent() {
  return new ToolLoopAgent({
    model: llmProvider("claude-sonnet-4-5"),
    stopWhen: [stepCountIs(10)],
    tools: {
      searchEmails: createSearchEmailsTool()
    },
    instructions:
      "You are a personal assistant with access to the user's emails. Help them find, summarize, and answer questions about their emails."
  });
}

export async function generateTitleForChat({
  messages
}: {
  messages: Array<MyUIMessage>;
}) {
  const {
    output: { title }
  } = await generateText({
    model: llmProvider("claude-haiku-4-5"),
    system:
      "Generate a short, descriptive title (max 6 words) for this conversation. Focus on the main topic or user intent.",
    messages: await convertToModelMessages(messages),
    output: Output.object({
      schema: z.object({
        title: z.string().min(1)
      })
    })
  });

  return title;
}

export async function rerankEmails() {}

function createSearchEmailsTool() {
  return tool({
    description:
      "Searches through the user's emails using semantic similarity. Returns up to 10 most relevant emails matching the query.",
    inputSchema: z.object({
      // keywords: z.array(z.string()).optional(),
      query: z
        .string()
        .describe(
          "Natural language search query to find relevant emails. Can include topics, sender/recipient names, or keywords."
        )
    }),
    // .superRefine(({ keywords = [], query }, ctx) => {
    //   if (keywords.length === 0 && query == null) {
    //     ctx.addIssue({
    //       code: "custom",
    //       message: "You must provide either keywords or query or both."
    //     });
    //   }
    // }),
    execute: async function executeSearchEmailsTool({ query }) {
      logger.info({ query }, `Executing searchEmailsTool`);

      const emails = await getAllEmails();

      const emailsWithScores = await searchWithEmbeddings({
        query,
        items: emails,
        toText(item) {
          return `${item.from} ${item.to} ${item.subject} ${item.body}`;
        }
      });

      const emailsToReturn = emailsWithScores.slice(0, 10).map(({ item }) => {
        return item;
      });

      return emailsToReturn;
    }
  });
}

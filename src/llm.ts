"server-only";

import { getAllEmails } from "@/app/persistance";
import { getEnv } from "@/src/env";
import { logger } from "@/src/logger";
import { rrf, searchWithBM25, searchWithEmbeddings } from "@/src/search";
import type { MyUIMessage } from "@/src/types";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  generateText,
  Output,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type InferUITools,
  type ToolSet
} from "ai";
import z from "zod";

const llmProvider = createAnthropic({
  apiKey: getEnv().ANTHROPIC_API_KEY
});

export function createEmailAssistantAgent({ tools }: { tools: ToolSet }) {
  return new ToolLoopAgent({
    model: llmProvider("claude-sonnet-4-5"),
    stopWhen: [stepCountIs(10)],
    tools,
    instructions:
      "You are a personal assistant with access to the user's emails. Help them find, summarize, and answer questions about their emails.",
    onStepFinish(step) {
      for (const toolCall of step.toolCalls) {
        if (toolCall.error) {
          logger.error({ error: toolCall.error });
        }
      }
    }
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

export function createSearchEmailsTool() {
  return tool({
    description:
      "Searches through the user's emails using semantic similarity. Returns up to 10 most relevant emails matching the query.",
    inputSchema: z
      .object({
        keywords: z
          .array(z.string())
          .describe(
            "List of optional keywords to use for narrowing the search. These can be topics, sender/recipient names, or other relevant terms."
          )
          .optional(),
        query: z
          .string()
          .optional()
          .describe(
            "Natural language search query to find relevant emails. Can include topics, sender/recipient names, or keywords."
          )
      })
      .superRefine(({ keywords = [], query }, ctx) => {
        if (keywords.length === 0 && query == null) {
          ctx.addIssue({
            code: "custom",
            message: "You must provide either keywords or query or both."
          });
        }
      }),
    execute: async function executeSearchEmailsTool({ query, keywords }) {
      logger.info({ query, keywords }, `Executing searchEmailsTool`);

      const emails = await getAllEmails();

      const searchedEmailsByEmbeddings = await searchWithEmbeddings({
        query: query ?? "",
        items: emails,
        toText(item) {
          return `${item.from} ${item.to} ${item.subject} ${item.body}`;
        }
      });

      const searchedEmailsByKeywords = searchWithBM25({
        keywords: keywords ?? [],
        items: emails,
        toText(item) {
          return `${item.from} ${item.to} ${item.subject} ${item.body}`;
        }
      });

      const emailsToReturn = searchedEmailsByEmbeddings
        .slice(0, 10)
        .map(({ item }) => {
          return item;
        });

      return emailsToReturn;
    }
  });
}

export function getTools() {
  return {
    searchEmails: createSearchEmailsTool()
  };
}

export type AllTools = InferUITools<ReturnType<typeof getTools>>;

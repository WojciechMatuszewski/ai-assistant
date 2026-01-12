"server-only";

import { getEnv } from "@/src/env";
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
    instructions: "You are a helpful assistant"
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

function createSearchEmailsTool() {
  return tool({
    description: "",
    inputSchema: z
      .object({
        keywords: z.array(z.string()).optional(),
        query: z.string().optional()
      })
      .superRefine(({ keywords = [], query }, ctx) => {
        if (keywords.length === 0 && query == null) {
          ctx.addIssue({
            code: "custom",
            message: "You must provide either keywords or query or both."
          });
        }
      }),
    execute: async function executeSearchEmailsTool() {}
  });
}

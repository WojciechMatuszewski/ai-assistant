"server-only";

import { getEnv } from "@/src/env";
import type { MyUIMessage } from "@/src/types";
import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  generateText,
  Output,
  stepCountIs,
  ToolLoopAgent
} from "ai";
import z from "zod";

const provider = createAnthropic({
  apiKey: getEnv().ANTHROPIC_API_KEY
});

export function createAgent() {
  return new ToolLoopAgent({
    model: provider("claude-sonnet-4-5"),
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
    model: provider("claude-haiku-4-5"),
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

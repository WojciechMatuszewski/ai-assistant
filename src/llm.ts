"server-only";

import { getEnv } from "@/src/env";
import { createAnthropic } from "@ai-sdk/anthropic";
import { stepCountIs, ToolLoopAgent } from "ai";

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

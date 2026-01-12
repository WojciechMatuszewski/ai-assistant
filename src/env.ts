"server-only";

import { z } from "zod";

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1)
});

export function getEnv() {
  return EnvSchema.parse(process.env);
}

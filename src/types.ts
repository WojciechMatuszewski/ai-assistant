import type { DBChat } from "@/app/persistance";
import type { AllTools } from "@/src/llm";

import type { UIMessage } from "ai";

export type MyUIMessage = UIMessage<
  unknown,
  {
    "frontend-chat": DBChat;
  },
  AllTools
>;

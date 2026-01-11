import type { DBChat } from "@/app/persistance";
import type { UIMessage } from "ai";

export type MyUIMessage = UIMessage<
  unknown,
  {
    "frontend-chat": DBChat;
  }
>;
